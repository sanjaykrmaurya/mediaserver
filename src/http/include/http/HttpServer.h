
#ifndef HttpServer_H
#define HttpServer_H
#include "net/netInterface.h"
#include "http/HttpServer.h"
#include "http/HttpConn.h"
#include "net/TcpServer.h"
#include "http/parser.h"
#include "http/responder.h"
#include "http/websocket.h"

namespace base {
    namespace net {

        /*******************************************************************************************************************************************************/

        /*******************************************************************************************************************************************************/


        class HttpServerBase : public TcpServerBase, public Listener  {
        public:

        public:
            HttpServerBase(Listener *listener, std::string ip, int port );

            ~HttpServerBase() override;

            /* Pure virtual methods inherited from ::HttpServerBase. */
        public:
            void UserOnTcpConnectionAlloc(TcpConnectionBase** connection) override;
            bool UserOnNewTcpConnection(TcpConnectionBase* connection) override;
            void UserOnTcpConnectionClosed(TcpConnectionBase* connection) override;

        private:
            // Passed by argument.
            Listener* listener{ nullptr};
            uv_tcp_t* uvHandle{ nullptr};
            //HttpConnection::Listener* connListener{ nullptr};
           // WebSocketConnection::Listener* wsConListener{ nullptr};

        protected:

        };

        /**********************************************************************************************************************/
        /******************************************************/
        ///

        /*************************************************************************************************/
        class HttpServer : public HttpServerBase {
        public:

            HttpServer( std::string ip, int port, ServerConnectionFactory *factory = nullptr);

            ServerResponder* createResponder(HttpConnection* conn);

            void start();

            void shutdown();

            void on_close(Listener* connection);

            void on_read(Listener* connection, const char* data, size_t len);
                     
            void on_header(Listener* connection);
      

           // HttpServerBase *tcpHTTPServer;

            ServerConnectionFactory* _factory;
            
        protected:
            std::string ip; int port;
            //Listener* listener{ nullptr};

        };


    } // namespace net
} // base


#endif // HttpServer_H