from datetime import datetime


class Recusa:
    """Registra que um usuário recusou o perfil de outro (no Discover ou em 'Quem curtiu você')."""

    def __init__(self, id: int | None, de_usuario_id: int, para_usuario_id: int,
                 criado_em: datetime | None = None):
        if de_usuario_id == para_usuario_id:
            raise ValueError("Um usuário não pode recusar a si mesmo")
        self._id = id
        self._de_usuario_id = de_usuario_id
        self._para_usuario_id = para_usuario_id
        self._criado_em = criado_em or datetime.now()

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def de_usuario_id(self) -> int:
        return self._de_usuario_id

    @property
    def para_usuario_id(self) -> int:
        return self._para_usuario_id

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "de_usuario_id": self._de_usuario_id,
            "para_usuario_id": self._para_usuario_id,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
        }
