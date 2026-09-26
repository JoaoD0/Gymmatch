from app.models.boost import Boost
from app.repositories.boost_repository import BoostRepository


class BoostJaAtivoError(Exception):
    pass


class BoostService:
    def __init__(self, boost_repository: BoostRepository | None = None):
        self._boosts = boost_repository or BoostRepository()

    def ativar(self, usuario_id: int) -> Boost:
        ativo = self._boosts.buscar_ativo_por_usuario(usuario_id)
        if ativo:
            raise BoostJaAtivoError("Já existe um boost ativo para este usuário")
        return self._boosts.criar(Boost(id=None, usuario_id=usuario_id))

    def buscar_ativo(self, usuario_id: int) -> Boost | None:
        return self._boosts.buscar_ativo_por_usuario(usuario_id)
