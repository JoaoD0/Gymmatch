"""Servidor estático do front durante o desenvolvimento. Uso: python serve_no_cache.py [porta]

- Cache-Control: no-cache: o navegador guarda os arquivos, mas confere com o servidor a cada acesso
  (resposta 304 quando nada mudou) — nunca mostra versão velha e não baixa tudo de novo.
- Escuta em IPv4 e IPv6 juntos: no Windows, "localhost" tenta primeiro o IPv6 (::1); se o servidor
  só escuta IPv4, cada arquivo leva ~200 ms até o navegador desistir e cair no 127.0.0.1.
- Atende vários pedidos em paralelo (cada página pede ~20 arquivos).
"""
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class RevalidarHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, formato, *args):
        pass  # sem uma linha no terminal por arquivo


class ServidorIPv4eIPv6(ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    print(f"Front em http://localhost:{porta}")
    ServidorIPv4eIPv6(("::", porta), RevalidarHandler).serve_forever()
