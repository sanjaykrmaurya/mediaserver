

#ifndef WebRTC_MultiplexMediaCapturer_H
#define WebRTC_MultiplexMediaCapturer_H


#include "base/base.h"

#ifdef HAVE_FFMPEG

#include "ff/ff.h"
#include "ff/mediacapture.h"
#include "webrtc/audiopacketmodule.h"
#include "webrtc/videopacketsource.h"

#include "api/peerconnectioninterface.h"


namespace base {
namespace wrtc {


class MultiplexMediaCapturer
{
public:
    MultiplexMediaCapturer();
    ~MultiplexMediaCapturer();

    void openFile(const std::string& file, bool loop = true);

    void addMediaTracks(webrtc::PeerConnectionFactoryInterface* factory,
                        webrtc::MediaStreamInterface* stream);

    void start();
    void stop();

    rtc::scoped_refptr<AudioPacketModule> getAudioModule();
    VideoPacketSource* createVideoSource();

protected:
//    PacketStream _stream;
    ff::MediaCapture::Ptr _videoCapture;
    rtc::scoped_refptr<AudioPacketModule> _audioModule;
};


} } // namespace wrtc


#endif // HAVE_FFMPEG
#endif

