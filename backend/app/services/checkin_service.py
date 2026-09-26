from datetime import datetime

from app.models.checkin import CheckIn
from app.models.usuario import Usuario
from app.repositories.checkin_repository import CheckInRepository
from app.services.feed_service import FeedService, SemAcademiaError


class CheckInService:
    def __init__(self, checkin_repository: CheckInRepository | None = None,
                 feed_service: FeedService | None = None):
        self._checkins = checkin_repository or CheckInRepository()
        self._feed = feed_service or FeedService()

    def obter(self, usuario_id: int) -> CheckIn | None:
        """Só devolve o check-in se ele ainda estiver valendo (dentro das 3h)."""
        checkin = self._checkins.buscar(usuario_id)
        return checkin if checkin and checkin.ativo() else None

    def fazer(self, usuario: Usuario, publicar_no_feed: bool) -> CheckIn:
        if not usuario.academia_id:
            raise SemAcademiaError("Escolha uma academia no perfil antes de fazer check-in")

        ja_estava = self.obter(usuario.id) is not None
        checkin = CheckIn(usuario.id)
        self._checkins.salvar(checkin)

        # renovar um check-in que ainda vale só atualiza o horário, sem repetir o post
        if publicar_no_feed and not ja_estava:
            self._feed.publicar_checkin(usuario)
        return checkin

    def sair(self, usuario: Usuario) -> None:
        self._checkins.deletar(usuario.id)

    def ids_ativos(self) -> set[int]:
        return set(self._checkins.listar_usuarios_desde(datetime.now() - CheckIn.DURACAO))
