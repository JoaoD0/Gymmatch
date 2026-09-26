from datetime import datetime, timedelta

DURACAO_BOOST = timedelta(hours=1)


class Boost:
    """Destaque temporário no Discover (simulado — sem pagamento real)."""

    def __init__(self, id: int | None, usuario_id: int, ativado_em: datetime | None = None,
                 expira_em: datetime | None = None):
        self._id = id
        self._usuario_id = usuario_id
        self._ativado_em = ativado_em or datetime.now()
        self._expira_em = expira_em or (self._ativado_em + DURACAO_BOOST)

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    @property
    def ativado_em(self) -> datetime:
        return self._ativado_em

    @property
    def expira_em(self) -> datetime:
        return self._expira_em

    def ativo(self) -> bool:
        return datetime.now() < self._expira_em

    def tempo_restante(self) -> timedelta:
        restante = self._expira_em - datetime.now()
        return restante if restante.total_seconds() > 0 else timedelta(0)

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "usuario_id": self._usuario_id,
            "ativado_em": self._ativado_em.isoformat() if self._ativado_em else None,
            "expira_em": self._expira_em.isoformat() if self._expira_em else None,
        }
