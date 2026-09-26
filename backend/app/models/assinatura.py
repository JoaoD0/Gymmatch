from datetime import datetime, timedelta

from app.models.plano import Plano

DURACAO_ASSINATURA = timedelta(days=30)


class Assinatura:
    """Assinatura de um plano pago (Gold/Diamond). Pagamento simulado — sem gateway real."""

    def __init__(self, id: int | None, usuario_id: int, plano: Plano,
                 iniciada_em: datetime | None = None, expira_em: datetime | None = None,
                 cancelada_em: datetime | None = None, cartao_final: str = "",
                 cartao_bandeira: str = ""):
        self._id = id
        self._usuario_id = usuario_id
        self.plano = plano
        self._iniciada_em = iniciada_em or datetime.now()
        self._expira_em = expira_em or (self._iniciada_em + DURACAO_ASSINATURA)
        self._cancelada_em = cancelada_em
        self.cartao_final = cartao_final
        self.cartao_bandeira = cartao_bandeira

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    @property
    def iniciada_em(self) -> datetime:
        return self._iniciada_em

    @property
    def expira_em(self) -> datetime:
        return self._expira_em

    @property
    def cancelada_em(self) -> datetime | None:
        return self._cancelada_em

    def cancelar(self) -> None:
        self._cancelada_em = datetime.now()

    def ativa(self) -> bool:
        return self._cancelada_em is None and datetime.now() < self._expira_em

    def dias_restantes(self) -> int:
        if not self.ativa():
            return 0
        return max(0, (self._expira_em - datetime.now()).days)

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "usuario_id": self._usuario_id,
            "plano": self.plano.chave,
            "iniciada_em": self._iniciada_em.isoformat() if self._iniciada_em else None,
            "expira_em": self._expira_em.isoformat() if self._expira_em else None,
            "cancelada_em": self._cancelada_em.isoformat() if self._cancelada_em else None,
            "cartao_final": self.cartao_final,
            "cartao_bandeira": self.cartao_bandeira,
        }
