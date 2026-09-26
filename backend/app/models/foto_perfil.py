from datetime import datetime


class FotoPerfil:
    """Uma foto da galeria de um usuário (até 6, ordenadas por posição)."""

    def __init__(self, id: int | None, usuario_id: int, url: str, posicao: int,
                 criado_em: datetime | None = None):
        self._id = id
        self._usuario_id = usuario_id
        self._url = url
        self._posicao = posicao
        self._criado_em = criado_em or datetime.now()

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    @property
    def url(self) -> str:
        return self._url

    @property
    def posicao(self) -> int:
        return self._posicao

    @posicao.setter
    def posicao(self, valor: int):
        self._posicao = valor

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "usuario_id": self._usuario_id,
            "url": self._url,
            "posicao": self._posicao,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
        }
