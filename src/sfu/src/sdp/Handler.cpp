
#include "sdp/Handler.h"
#include "LoggerTag.h"
#include "base/error.h"
#include "sdp/ortc.h"
#include "sdp/signaler.h"
#include "sdp/Peer.h"
#include "sdp/Utils.h"
#include "base/uuid.h"
#include "sdp/Room.h"

using json = nlohmann::json;

namespace SdpParse {
    
    
    void Handler::_setupTransport(const json & sdpObject, const std::string localDtlsRole) {

        // Get our local DTLS parameters.
        dtlsParameters = Sdp::Utils::extractDtlsParameters(sdpObject);
        // Set our DTLS role.
        dtlsParameters["role"] = localDtlsRole;

        // Update the remote DTLS role in the SDP.
        remoteSdp->UpdateDtlsRole(
                localDtlsRole == "client" ? "server" : "client");
    }
    
    void Handler::createSdp(const json& iceParameters, const json& iceCandidates, const json& dtlsParameters) {
        remoteSdp = new Sdp::RemoteSdp(iceParameters, iceCandidates, dtlsParameters, nullptr);
    }


    void Handler::transportCreate()
    {
        {
            json ack_resp;
            json param = json::array();
            param.push_back("createWebRtcTransport");
            param.push_back(peer->participantID);

            json &trans = Settings::configuration.createWebRtcTransport;
            transportId = uuid4::uuid();

            if(!forceTcp)
            {
                trans["data"]["enableUdp"] =true;
                trans["data"]["preferUdp"] =true;
            }

            trans["data"]["listenIps"]= Settings::configuration.listenIps;
            raiseRequest( param, trans, ack_resp);;

            json &ackdata = ack_resp.at(0)["data"];
            createSdp(ackdata["iceParameters"], ackdata["iceCandidates"], ackdata["dtlsParameters"]);
            //answer = GetAnswer();
        }
        {
            json ack_resp;
            json param = json::array();
            param.push_back("maxbitrate");
            param.push_back(peer->participantID);
            json &trans = Settings::configuration.maxbitrate;
            raiseRequest( param, trans, ack_resp);
        }
         
    }
   
    
    void Handler::raiseRequest( json &param , json& trans, json& ack_resp)
    {
        
       // trans["id"] = ++peer->reqId;
        trans["internal"]["transportId"] = transportId;
        trans["internal"]["routerId"]= room->routerId;
        param.push_back(trans);
        
        signaler->request(classtype, param, true, ack_resp);
    }
    
    void Handler::transportConnect()
    {
        json ack_resp;
        json param = json::array();
        param.push_back("transport.connect");
        param.push_back(peer->participantID);
        json &trans = Settings::configuration.transport_connect;
        //STrace << "peer->dtlsParameters " << dtlsParameters;
        trans["data"]["dtlsParameters"] = dtlsParameters;
        raiseRequest( param, trans, ack_resp);

    }
       
    
    Producers::Producers(Signaler *signaler, Room *room, Peer *peer): Handler(signaler, room, peer)
    {
        classtype = "Producers";
    }
 
    std::string Producers::GetAnswer() {


        sendingRtpParameters = peer->sendingRtpParametersByKind["video"];

        const Sdp::RemoteSdp::MediaSectionIdx mediaSectionIdx = remoteSdp->GetNextMediaSectionIdx();

        json& offerMediaObject = peer->sdpObject["media"][mediaSectionIdx.idx];

        auto midIt = offerMediaObject.find("mid");

        if (midIt == offerMediaObject.end()) {
            SError << "Found no mid in SDP";
            throw "Found no mid in SDP";
        }

        sendingRtpParameters["mid"] = *midIt;

        sendingRtpParameters["rtcp"]["cname"] = Sdp::Utils::getCname(offerMediaObject);
        sendingRtpParameters["encodings"] = Sdp::Utils::getRtpEncodings(offerMediaObject);


        // If VP8 and there is effective simulcast, add scalabilityMode to each encoding.
        auto mimeType = sendingRtpParameters["codecs"][0]["mimeType"].get<std::string>();

        std::transform(mimeType.begin(), mimeType.end(), mimeType.begin(), ::tolower);

        if (
                sendingRtpParameters["encodings"].size() > 1 &&
                (mimeType == "video/vp8" || mimeType == "video/h264")
                ) {
            for (auto& encoding : sendingRtpParameters["encodings"]) {
                encoding["scalabilityMode"] = "S1T3";
            }
        }

        // STrace << "sendingRtpParameters "  <<  sendingRtpParameters ;

        json *codecOptions = nullptr;

        _setupTransport(peer->sdpObject, "server");

        remoteSdp->Send(
                offerMediaObject,
                mediaSectionIdx.reuseMid,
                sendingRtpParameters,
                peer->sendingRemoteRtpParametersByKind["video"],
                codecOptions);

        auto answer = remoteSdp->GetSdp();

        if (remoteSdp) {
            delete remoteSdp;
            remoteSdp = nullptr;
        }

        STrace << "answer: " << answer;
        return answer;
    }

    
    
    void Producers::runit() {
        
        Producer *p = new Producer();
        
        transportCreate();
        p->answer = GetAnswer();
        transportConnect();

        {
            STrace << "sendingRtpParameters " << sendingRtpParameters.dump(4);


            json ack_resp;
            json param = json::array();
            param.push_back("transport.produce");
            param.push_back(peer->participantID);
            json &trans = Settings::configuration.transport_produce;
            
            trans["internal"]["producerId"] = uuid4::uuid();


            // This may throw.
            auto rtpMapping = SdpParse::ortc::getProducerRtpParametersMapping(sendingRtpParameters, Settings::configuration.routerCapabilities);

            auto consumableRtpParameters = SdpParse::ortc::getConsumableRtpParameters("video", sendingRtpParameters, Settings::configuration.routerCapabilities, rtpMapping);


            STrace << "consumableRtpParameters " << rtpMapping.dump(4);
            STrace << "rtpMapping " << rtpMapping.dump(4);


            json data = {
                {"kind", "video"},
                {"paused", false},
                {"rtpMapping", rtpMapping},
                {"rtpParameters", sendingRtpParameters},
            };

            trans["data"] = data;

            raiseRequest( param, trans, ack_resp);


            p->producer = {
                { "id", trans["internal"]["producerId"]},
                {"kind", "video"},
                {"rtpParameters", sendingRtpParameters},
                {"type", ack_resp.at(0)["data"]["type"]},
                { "consumableRtpParameters", consumableRtpParameters}

            };

            STrace << "Final Producer " << p->producer.dump(4);
            
            mapProducer[p->producer["id"]] = p;


        }
    }


    /*************************************************************************************************************
        Producer starts
     *************************************************************************************************************/
    Consumers::Consumers(Signaler *signaler, Room *room, Peer * peer, Producers *producers) : Handler(signaler, room, peer),producers(producers)
    {
        classtype = "Consumers";
    }


    std::string Consumers::GetOffer(const std::string& id, const std::string& kind, const json& rtpParameters) {
        std::string localId;

        //static int mid=0;  // wrong TBD

        // mid is optional, check whether it exists and is a non empty string.
        auto midIt = rtpParameters.find("mid");
        if (midIt != rtpParameters.end() && (midIt->is_string() && !midIt->get<std::string>().empty()))
            localId = midIt->get<std::string>();
        else
            localId = std::to_string(mid++);

        auto& cname = rtpParameters["rtcp"]["cname"];

        this->remoteSdp->Receive(localId, kind, rtpParameters, cname, id);

        auto offer = this->remoteSdp->GetSdp();

        STrace << "offer: " << offer;
        return offer;
    }

    
    
    void Consumers::resume(Signaler *signal, bool pause ) {
        
//         {
//            json ack_resp;
//            json &trans = Settings::configuration.consumer_resume;
//            json param = json::array();
//            if(pause)
//            {
//                param.push_back("consumer.pause");
//                trans["method"] = "consumer.pause";
//            }
//            else
//            {
//                param.push_back("consumer.resume");
//                trans["method"] = "consumer.resume";
//            }
//            
//            param.push_back(peer->participantID);
//            
//            trans["internal"]["producerId"] =  producer["id"];
//            trans["internal"]["consumerId"] =  consumer["id"];

//            
//            raiseRequest( param, trans, ack_resp);
//        }
    
    }
    
    /**
     * Load andwer SDP.
     */
    void Consumers::loadAnswer(std::string sdp ) {
        ////////////////////////
        json ansdpObject = sdptransform::parse(sdp);
        //SDebug << "answer " << ansdpObject.dump(4);
        _setupTransport(ansdpObject, "client");

        transportConnect();

    }

 

    void Consumers::runit() {

        transportCreate();
  
        for( auto& prod : producers->mapProducer)
        {
            json &producer = prod.second->producer;
                    
            json ack_resp;
            json param = json::array();
            param.push_back("transport.consume");
            param.push_back(peer->participantID);
            json &trans = Settings::configuration.transport_consume;

            trans["internal"]["producerId"] = producer["id"];
            trans["internal"]["consumerId"] = uuid4::uuid();



            json rtpParameters = SdpParse::ortc::getConsumerRtpParameters(producer["consumableRtpParameters"], (json&) peer->GetRtpCapabilities());
            //  const internal = Object.assign(Object.assign({}, this._internal), { consumerId: v4_1.default(), producerId });

            STrace << "getConsumerRtpParameters " << rtpParameters.dump(4);

            //bool paused = producer["kind"] == "video" ? true : false;

            json reqData = {
                {"kind", producer["kind"]},
                {"rtpParameters", rtpParameters},
                {"type", producer["type"]},
                {"consumableRtpEncodings", producer["consumableRtpParameters"]["encodings"]},
                {"paused", false}
            };

            trans["data"] = reqData;
            raiseRequest( param, trans, ack_resp);

            json &ackdata = ack_resp.at(0)["data"];

            Consumer *c= new Consumer();
            c->consumer = {

                {"id", trans["internal"]["consumerId"]},
                {"kind", trans["data"]["kind"]},
                {"rtpParameters", trans["data"]["rtpParameters"]},
                {"type", trans["data"]["type"]},
                {"paused", ackdata["paused"]},
                {"producerPaused", ackdata["producerPaused"]},
                {"score", ackdata["score"]},
                {"preferredLayers", ackdata["preferredLayers"]}

            };

            STrace << "Final Consumer " << c->consumer.dump(4);
            ///////////////////

            c->offer = GetOffer(c->consumer["id"], c->consumer["kind"], c->consumer["rtpParameters"]);
            
            mapConsumer[ c->consumer["id"]] = c; 

        }



    }


} // namespace SdpParse