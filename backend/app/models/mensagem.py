from datetime import datetime


class Mensagem:
    def __init__(self, id: int | None, match_id: int, remetente_id: int, texto: str,
                 criado_em: datetime | None = None):
        if not texto or not texto.strip():
            raise ValueError("Mensagem não pode ser vazia")
        if len(texto) > 1000:
            raise ValueError("Mensagem excede o tamanho máximo de 1000 caracteres")
        self._id = id
        self._match_id = match_id
        self._remetente_id = remetente_id
        self._texto = texto.strip()
        self._criado_em = criado_em or datetime.now()

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def match_id(self) -> int:
        return self._match_id

    @property
    def remetente_id(self) -> int:
        return self._remetente_id

    @property
    def texto(self) -> str:
        return self._texto

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "match_id": self._match_id,
            "remetente_id": self._remetente_id,
            "texto": self._texto,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
        }
