from datetime import datetime, timedelta

TAGS_TREINO = {
    "Novo PR!",
    "Treino de hoje",
    "Cardio",
    "Pernas",
    "Peito",
    "Costas",
    "Ombros",
    "Braços",
    "Funcional",
    "Dia de descanso",
}

DURACAO_MOVE = timedelta(hours=24)


class Move:
    """Story de treino (foto + texto + tag) que fica visível por 24h."""

    def __init__(self, id: int | None, usuario_id: int, texto: str, foto_url: str,
                 tag: str | None = None, criado_em: datetime | None = None,
                 expira_em: datetime | None = None):
        self._id = id
        self._usuario_id = usuario_id
        self.foto_url = foto_url
        self.texto = texto
        self.tag = tag
        self._criado_em = criado_em or datetime.now()
        self._expira_em = expira_em or (self._criado_em + DURACAO_MOVE)

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    @property
    def expira_em(self) -> datetime:
        return self._expira_em

    @property
    def texto(self) -> str:
        return self._texto

    @texto.setter
    def texto(self, valor: str):
        valor = (valor or "").strip()
        if len(valor) > 150:
            raise ValueError("Texto do move deve ter no máximo 150 caracteres")
        self._texto = valor

    @property
    def tag(self) -> str | None:
        return self._tag

    @tag.setter
    def tag(self, valor: str | None):
        if valor is not None and valor not in TAGS_TREINO:
            raise ValueError(f"Tag inválida: {valor}")
        self._tag = valor

    def expirado(self) -> bool:
        return datetime.now() >= self._expira_em

    def tempo_decorrido(self) -> str:
        minutos = int((datetime.now() - self._criado_em).total_seconds() // 60)
        if minutos < 1:
            return "agora"
        if minutos < 60:
            return f"{minutos}min"
        horas = minutos // 60
        if horas < 24:
            return f"{horas}h"
        dias = horas // 24
        return f"{dias}d"

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "usuario_id": self._usuario_id,
            "texto": self._texto,
            "foto_url": self.foto_url,
            "tag": self._tag,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
            "expira_em": self._expira_em.isoformat() if self._expira_em else None,
            "tempo": self.tempo_decorrido(),
        }
