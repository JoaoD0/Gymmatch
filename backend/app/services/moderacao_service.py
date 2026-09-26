from app.models.bloqueio import Bloqueio
from app.models.denuncia import Denuncia
from app.repositories.bloqueio_repository import BloqueioRepository
from app.repositories.denuncia_repository import DenunciaRepository
from app.repositories.match_repository import MatchRepository


class ModeracaoService:
    """Regras de bloqueio e denúncia entre usuários."""

    def __init__(self, bloqueio_repository: BloqueioRepository | None = None,
                 denuncia_repository: DenunciaRepository | None = None,
                 match_repository: MatchRepository | None = None):
        self._bloqueios = bloqueio_repository or BloqueioRepository()
        self._denuncias = denuncia_repository or DenunciaRepository()
        self._matches = match_repository or MatchRepository()

    def bloquear(self, usuario_id: int, outro_id: int) -> None:
        self._bloqueios.criar(Bloqueio(id=None, bloqueador_id=usuario_id, bloqueado_id=outro_id))
        match = self._matches.buscar_entre(usuario_id, outro_id)
        if match and match.ativo:
            self._matches.encerrar(match.id)

    def denunciar(self, usuario_id: int, outro_id: int, motivo: str) -> None:
        self._denuncias.criar(Denuncia(id=None, denunciante_id=usuario_id, denunciado_id=outro_id, motivo=motivo))
        self.bloquear(usuario_id, outro_id)  # denunciar também bloqueia, igual ao original
