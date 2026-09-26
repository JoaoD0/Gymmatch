from app.models.assinatura import Assinatura
from app.models.plano import Plano
from app.repositories.assinatura_repository import AssinaturaRepository


class PlanoInvalidoError(Exception):
    pass


class PlanoService:
    def __init__(self, assinatura_repository: AssinaturaRepository | None = None):
        self._assinaturas = assinatura_repository or AssinaturaRepository()

    def plano_atual(self, usuario_id: int) -> Plano:
        assinatura = self._assinaturas.buscar_ativa_por_usuario(usuario_id)
        return assinatura.plano if assinatura else Plano.por_chave("gratis")

    def assinatura_ativa(self, usuario_id: int) -> Assinatura | None:
        return self._assinaturas.buscar_ativa_por_usuario(usuario_id)

    def assinar(self, usuario_id: int, chave: str, cartao_final: str, cartao_bandeira: str) -> Assinatura:
        if chave == "gratis":
            raise PlanoInvalidoError("Não é possível assinar o plano Grátis")
        try:
            plano = Plano.por_chave(chave)
        except ValueError:
            raise PlanoInvalidoError(f"Plano inválido: {chave}")

        # cancela a assinatura anterior (permite trocar de Gold <-> Diamond)
        self._assinaturas.cancelar_ativas_do_usuario(usuario_id)
        nova = Assinatura(id=None, usuario_id=usuario_id, plano=plano,
                           cartao_final=cartao_final, cartao_bandeira=cartao_bandeira)
        return self._assinaturas.criar(nova)

    def cancelar(self, usuario_id: int) -> None:
        self._assinaturas.cancelar_ativas_do_usuario(usuario_id)
