################################################################################
### CUSTOMIZE BELOW HERE #######################################################

CC	= clang
CXX     = g++
TARGET=runDBUpload # define the name of the executable
SOURCES=$(wildcard *.cpp ../../../libuv/src/*.cpp ../../../libuv/src/unix/*.cpp ../../../base/src/*.cpp )

CXXFLAGS   := -g -std=c++14 -Wno-inconsistent-missing-override -Wno-uninitialized


CPPFLAGS   := -I/data/del/aws-sdk-cpp/aws-cpp-sdk-core/include -I/data/del/aws-sdk-cpp/aws-cpp-sdk-dynamodb/include -I../../../json/include/ -I../../crypto/include/ -I../../http/include/ -I../../../base/include/ -I../../net/include/ -I../../../libuv/include -I../../../libuv/src -I../../../build/ -I../../http_parser/ \
               -DAWS_COMMON_USE_IMPORT_EXPORT -DAWS_EVENT_STREAM_USE_IMPORT_EXPORT -DAWS_SDK_VERSION_MAJOR=1 -DAWS_SDK_VERSION_MINOR=7 -DAWS_SDK_VERSION_PATCH=289 -DENABLE_CURL_CLIENT -DENABLE_OPENSSL_ENCRYPTION -DHAS_PATHCONF -DHAS_UMASK -DPLATFORM_LINUX \
              
LDFLAGS   := -L/data/del/aws-sdk-cpp/build/aws-cpp-sdk-core -L/data/del/aws-sdk-cpp/build/aws-cpp-sdk-dynamodb



LDLIBS    := -lpthread -laws-cpp-sdk-core -laws-cpp-sdk-dynamodb -lm -ldl -lssl -lcrypto

#SLIBS     := /data/mozilla/webrtc-builds/out/webrtc-22215-d8831bb-linux-x64/lib/x64/Debug/libwebrtc_full.a


################################################################################
### DO NOT EDIT THE FOLLOWING LINES ############################################


# define list of objects
OBJSC=$(SOURCES:.cpp=.o)
OBJS=$(OBJSC:.cpp=.o)

# the target is obtained linking all .o files
all: $(SOURCES) $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) $(LDFLAGS) $(OBJS) $(LDLIBS) $(SLIBS) -o $(TARGET)

purge: clean
	rm -f $(TARGET)

clean:
	rm -f  $(OBJS)

################################################################################
################################################################################
