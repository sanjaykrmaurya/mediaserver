#include "hmTcpClient.h"
#include "hmUdpClient.h"
#include "base/logger.h"
#include "base/application.h"
#include "base/platform.h"
#include <math.h>       /* ceil */


////////////////////
#include <stdio.h>
#include <sys/stat.h>

#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdlib.h>
//////////////////

//using std::endl;
using namespace base;
using namespace net;

hmUdpClient::hmUdpClient(std::string IP, int port) : IP(IP), port(port),restartPacketNo(0), uploadedPacketNO(0),TcpConnection(this) {

//    for (int x = 0; x < clientCount; ++x) {
//        clinetstorage[x] = new char[UdpDataSize];
//    }


    
    storage = nullptr;

    size_of_packet = sizeof (struct Packet);
    send_buffer = new char[size_of_packet];
    
    //sendheader = true;
   // sendfile= true;

    uv_sem_init(&sem, 0);
    
    rem=0;

}

hmUdpClient::~hmUdpClient() {

//    join();
    
    delete []send_buffer;
     
    if(fd  > 0 )
    {
      munmap(storage, size);
      close(fd);
    }  
    
   // delete udpClient;
   // udpClient = nullptr;

    uv_sem_destroy(&sem);


    LTrace("~hmUdpClient()" )
}

void hmUdpClient::restartUPload(uint32_t uploaded)
{
   // udp_client_mutex.lock();
    restUpload = true; 
    rem = uploaded;
    uv_sem_post(&sem);

    //udp_client_mutex.unlock();

}

void hmUdpClient::run() {
    
    LTrace("run start")
    SInfo << "Send File start";

    while( !stopped()  && uploadedPacketNO < lastPacketNo  )
    {
        //
        udp_client_mutex.lock();

        if (!rem){
            udpClient->connect();
            sendHeader(m_fileName);
        }

        if(rem < lastPacketNo )
            sendFile();

        ++rem;

       // STrace << "Read Packet Frame " << rem;

        if(restUpload || ( (uploadedPacketNO < lastPacketNo) && (rem >  lastPacketNo)  ))
        {
          STrace << "Read Packet Frame " << rem << " Uploaded " << uploadedPacketNO << " Lastpacketno " <<  lastPacketNo ;
          uv_sem_wait(&sem); /* should block */
          restUpload = false; 
        }

        udp_client_mutex.unlock();

    }

    LTrace("Upload over")
}

//void hmUdpClient::send(char* data, unsigned int lent) {
//    std::cout << "sending data " << lent << std::endl;
//    udpClient->send(data, lent);
//}

void hmUdpClient::shutdown() {
    
    LInfo("hmUdpClient::shutdown()::stop");
    
    restUpload =false;
    stop();
    restartUPload(lastPacketNo);
    join();
    
    if(udpClient)
    {

        udpClient->Close();
        
      //  base::sleep(500);
        
     
         LInfo("hmUdpClient::shutdown()::udpClient");

    }
    
    LInfo("hmUdpClient::shutdown()::over");
}

bool hmUdpClient::upload( std::string fileName, std::string driverId, std::string metaData)
{
    struct stat st;
    fd = open(fileName.c_str(), O_RDONLY,1);

    int rc = fstat(fd, &st);

    size=st.st_size;
    m_fileName = fileName;
    m_driverId  = driverId;
    m_metaData = metaData;

    if(fd > 0)
    {
        lastPacketNo = ceil((float)size / (float) (UdpDataSize));
        SInfo << "fileSize: "  <<  size ;
        SInfo << "Last packet no: "  <<  lastPacketNo ;

        storage = (char *)mmap(0, size, PROT_READ ,MAP_SHARED , fd, 0);
        return true;
    }
    else {
        SError << "Cannot open file: " << fileName ;
        return false;
    }
}

void hmUdpClient::sendPacket(uint8_t type, uint32_t payloadNo, uint32_t payloadsize, char *payload) {

    // SInfo << "Sending "  <<  (int) type <<  " payloadNo " << payloadNo  << " payloadsize " << payloadsize;
    
    Packet packet;
    packet.type = type;
    packet.payload_number = payloadNo;
    packet.payloadlen = payloadsize;

            
    memcpy(packet.payload, payload, payloadsize);
    memset(send_buffer, 0, size_of_packet);
    memcpy(send_buffer, (char*) &packet, size_of_packet);

    send(send_buffer, size_of_packet);

}

char *hmUdpClient::storage_row(unsigned int n) {
    return storage + (n * UdpDataSize);
}




void hmUdpClient::sendHeader(const std::string fileName) {

    SInfo << "Send Header";
            
    if (fd> 0 ) {

         if (!stopped())
         {

            std::string mtTmp = m_driverId  +";" + m_metaData;
            sendPacket(0, lastPacketNo, mtTmp.length()+1, (char*)mtTmp.c_str());
         }
    

    }
}

void hmUdpClient::sendFile() {


    if (rem  < lastPacketNo-1) {
         // char *output = str2md5(data_packet.data, data_size);
        //char *output1 = str2md5(buffer[send_count], data_size);
        sendPacket(1, rem, UdpDataSize , storage_row(rem));
        
    }

    else if( rem  < lastPacketNo) {
        uint32_t lastPacketLen = size - rem*UdpDataSize;
        sendPacket(1, rem, lastPacketLen, storage_row(rem));
    }
}

 
