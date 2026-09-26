from datetime import datetime, timedelta


class CheckIn:
    """Presença na academia: vale por DURACAO a partir de feito_em."""

    DURACAO = timedelta(hours=3)

    def __init__(self, usuario_id: int, feito_em: datetime | None = None):
        self._usuario_id = usuario_id
        self._feito_em = feito_em or datetime.now()

    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    @property
    def feito_em(self) -> datetime:
        return self._feito_em

    def expira_em(self) -> datetime:
        return self._feito_em + self.DURACAO

    def ativo(self, agora: datetime | None = None) -> bool:
        return (agora or datetime.now()) < self.expira_em()

    def tempo_restante(self, agora: datetime | None = None) -> str:
        restante = self.expira_em() - (agora or datetime.now())
        minutos = max(0, int(restante.total_seconds() // 60))
        horas, minutos = divmod(minutos, 60)
        return f"{horas}h {minutos}min restantes" if horas > 0 else f"{minutos}min restantes"

    def to_dict(self) -> dict:
        return {
            "ativo": self.ativo(),
            "feito_em": self._feito_em,
            "expira_em": self.expira_em(),
            "tempo_restante": self.tempo_restante(),
        }
