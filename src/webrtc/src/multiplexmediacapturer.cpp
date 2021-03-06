
#include "webrtc/multiplexmediacapturer.h"

#ifdef HAVE_FFMPEG

#include "ff/audioresampler.h"
#include "ff/ffmpeg.h"
//#include "ff/realtimepacketqueue.h"
#include "base/filesystem.h"
#include "base/logger.h"
#include "webrtc/webrtc.h"
#include "media/engine/webrtcvideocapturerfactory.h"
#include "modules/video_capture/video_capture_factory.h"


namespace base {
namespace wrtc {

MultiplexMediaCapturer::MultiplexMediaCapturer()
    : _videoCapture(std::make_shared<ff::MediaCapture>())
    , _audioModule(AudioPacketModule::Create())
{
     using std::placeholders::_1;
   // _stream.attachSource(_videoCapture, true);
    // _stream.attach(std::make_shared<av::RealtimePacketQueue<av::MediaPacket>>(0), 5);
    // _stream.attach(std::make_shared<av::RealtimePacketQueue<av::PlanarVideoPacket>>(0), 5);
  //  _stream.emitter += packetSlot(_audioModule.get(), &AudioPacketModule::onAudioCaptured);
    
    _videoCapture->cbProcessAudio = std::bind(&AudioPacketModule::onAudioCaptured , _audioModule.get(), _1);
}


MultiplexMediaCapturer::~MultiplexMediaCapturer()
{
}


void MultiplexMediaCapturer::openFile(const std::string& file, bool loop)
{
    // Open the capture file
    _videoCapture->setLoopInput(loop);
    _videoCapture->setLimitFramerate(true);
    _videoCapture->openFile(file);

    // Set the output settings
    if (_videoCapture->audio()) {
        _videoCapture->audio()->oparams.sampleFmt = "s16";
        _videoCapture->audio()->oparams.sampleRate = 44000;
        _videoCapture->audio()->oparams.channels = 2;
        _videoCapture->audio()->recreateResampler();
        // _videoCapture->audio()->resampler->maxNumSamples = 440;
        // _videoCapture->audio()->resampler->variableOutput = false;
    }

    // Convert to yuv420p for WebRTC compatability
    if (_videoCapture->video()) {
        _videoCapture->video()->oparams.pixelFmt = "yuv420p"; // nv12
        // _videoCapture->video()->oparams.width = capture_format.width;
        // _videoCapture->video()->oparams.height = capture_format.height;
    }
}


VideoPacketSource* MultiplexMediaCapturer::createVideoSource()
{
    using std::placeholders::_1;
    assert(_videoCapture->video());
    auto oparams = _videoCapture->video()->oparams;
    auto source = new VideoPacketSource(oparams.width, oparams.height,
                                        oparams.fps, cricket::FOURCC_I420);
    
    _videoCapture->cbProcessVideo = std::bind(&VideoPacketSource::onVideoCaptured ,source , _1);
    
//    source->setPacketSource(&_stream.emitter); // nullified on VideoPacketSource::Stop
    
    
    return source;
}


rtc::scoped_refptr<AudioPacketModule> MultiplexMediaCapturer::getAudioModule()
{
   return _audioModule;
}


void MultiplexMediaCapturer::addMediaTracks(
    webrtc::PeerConnectionFactoryInterface* factory,
    webrtc::MediaStreamInterface* stream)
{
    // This capturer is multicast, meaning it can be used as the source
    // for multiple Peer objects.
    //
    // KLUDGE: Pixel format conversion should happen on the
    // VideoPacketSource rather than on the decoder becasue different
    // peers may request different optimal output video sizes.

    // Create and add the audio stream
    if (_videoCapture->audio()) {
        stream->AddTrack(factory->CreateAudioTrack(
            kAudioLabel, factory->CreateAudioSource(nullptr)));
    }

    // Create and add the video stream
    if (_videoCapture->video()) {
        stream->AddTrack(factory->CreateVideoTrack(
            kVideoLabel, factory->CreateVideoSource(createVideoSource(), nullptr)));
    }

    // Default WebRTC video stream for testing
    // stream->AddTrack(factory->CreateVideoTrack(
    //     kVideoLabel, factory->CreateVideoSource(openVideoDefaultWebRtcCaptureDevice(), nullptr)));
}


void MultiplexMediaCapturer::start()
{
    //_stream.start
    _videoCapture->start();
}

void MultiplexMediaCapturer::stop()
{
  // _stream.stop();
    _videoCapture->stop();
}


} } // namespace wrtc


#endif // HAVE_FFMPEG
