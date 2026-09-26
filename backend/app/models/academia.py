from datetime import datetime


class Academia:
    def __init__(self, id: int | None, nome: str, endereco: str = "",
                 criado_em: datetime | None = None):
        self._id = id
        self.nome = nome
        self.endereco = endereco
        self._criado_em = criado_em or datetime.now()

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "nome": self.nome,
            "endereco": self.endereco,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
        }
