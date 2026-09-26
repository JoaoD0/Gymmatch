from app.models.curtida import Curtida
from app.models.match import Match
from app.models.perfil import Perfil
from app.models.plano import Plano
from app.models.recusa import Recusa
from app.models.usuario import Usuario
from app.repositories.bloqueio_repository import BloqueioRepository
from app.repositories.boost_repository import BoostRepository
from app.repositories.curtida_repository import CurtidaRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.recusa_repository import RecusaRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.services.checkin_service import CheckInService


class SemAcademiaError(Exception):
    pass


class LimiteCurtidasError(Exception):
    pass


class LimiteMatchesError(Exception):
    pass


class DesfazerNaoPermitidoError(Exception):
    pass


class DiscoverService:
    """Regra de negócio de curtir/match — equivalente Python da função handle_swipe do GymMatch original."""

    def __init__(self, usuario_repository: UsuarioRepository | None = None,
                 curtida_repository: CurtidaRepository | None = None,
                 match_repository: MatchRepository | None = None,
                 boost_repository: BoostRepository | None = None,
                 recusa_repository: RecusaRepository | None = None,
                 bloqueio_repository: BloqueioRepository | None = None,
                 checkin_service: CheckInService | None = None):
        self._usuarios = usuario_repository or UsuarioRepository()
        self._curtidas = curtida_repository or CurtidaRepository()
        self._matches = match_repository or MatchRepository()
        self._boosts = boost_repository or BoostRepository()
        self._recusas = recusa_repository or RecusaRepository()
        self._bloqueios = bloqueio_repository or BloqueioRepository()
        self._checkins = checkin_service or CheckInService()

    def listar_perfis_para_descobrir(self, usuario: Usuario) -> list[Usuario]:
        if not usuario.academia_id:
            raise SemAcademiaError("Usuário precisa estar vinculado a uma academia para usar o Discover")

        candidatos = self._usuarios.listar_por_academia(
            usuario.academia_id, excluir_usuario_id=usuario.id, apenas_ativos=True
        )

        ja_curtidos = set(self._curtidas.listar_ids_curtidos_por_usuario(usuario.id))
        ja_recusados = set(self._recusas.listar_ids_recusados_por_usuario(usuario.id))
        bloqueados = set(self._bloqueios.listar_ids_bloqueados_bidirecional(usuario.id))
        excluir = ja_curtidos | ja_recusados | bloqueados
        return [c for c in candidatos if c.id not in excluir]

    def listar_com_presenca(self, usuario: Usuario) -> list[tuple[Usuario, bool]]:
        """Perfis para o Discover com a flag "na academia agora".

        Ordem: boost ativo primeiro, depois quem fez check-in, depois o resto (sort estável).
        """
        candidatos = self.listar_perfis_para_descobrir(usuario)
        na_academia = self._checkins.ids_ativos()
        boostados = set(self._boosts.listar_usuarios_com_boost_ativo())
        candidatos = sorted(candidatos, key=lambda u: (u.id not in boostados, u.id not in na_academia))
        return [(u, u.id in na_academia) for u in candidatos]

    @staticmethod
    def perfil_para_descobrir(perfil: Perfil) -> dict:
        """Aplica as preferências de privacidade do dono do perfil antes de mostrar a outro usuário."""
        dados = perfil.to_dict()
        if perfil.ocultar_objetivo:
            dados["procurando"] = None
            dados["aberto_a"] = []
        if perfil.ocultar_orientacao:
            dados["orientacao_sexual"] = ""
        if perfil.ocultar_horarios:
            dados["quando_treina"] = []
        return dados

    def curtir(self, de_usuario_id: int, para_usuario_id: int, plano: Plano) -> Match | None:
        """Registra a curtida e, se houver curtida recíproca, cria (ou retorna) o match.

        Respeita os limites diários de curtidas e de matches do plano do usuário.
        """
        limite_curtidas = plano.limite_curtidas_diarias()
        if limite_curtidas is not None and self._curtidas.contar_hoje_por_usuario(de_usuario_id) >= limite_curtidas:
            raise LimiteCurtidasError("Limite diário de curtidas atingido")

        curtida = Curtida(id=None, de_usuario_id=de_usuario_id, para_usuario_id=para_usuario_id)
        self._curtidas.criar(curtida)

        if not self._curtidas.existe_curtida_reciproca(de_usuario_id, para_usuario_id):
            return None

        limite_matches = plano.limite_matches()
        if limite_matches is not None and len(self._matches.listar_por_usuario(de_usuario_id)) >= limite_matches:
            raise LimiteMatchesError("Limite de matches do plano atingido")

        return self._matches.criar(de_usuario_id, para_usuario_id)

    def recusar(self, de_usuario_id: int, para_usuario_id: int) -> None:
        self._recusas.criar(Recusa(id=None, de_usuario_id=de_usuario_id, para_usuario_id=para_usuario_id))

    def desfazer_curtida(self, de_usuario_id: int, para_usuario_id: int, plano: Plano) -> None:
        if not plano.pode_desfazer_curtida():
            raise DesfazerNaoPermitidoError("Seu plano não permite desfazer curtidas")
        self._matches.deletar_entre(de_usuario_id, para_usuario_id)
        self._curtidas.deletar(de_usuario_id, para_usuario_id)

    def listar_curtidas_recebidas(self, usuario_id: int, plano: Plano) -> tuple[list[Curtida], int]:
        total = self._curtidas.contar_recebidas_pendentes(usuario_id)
        visiveis = plano.curtidas_recebidas_visiveis()

        if visiveis == 0:
            return [], total

        pendentes = self._curtidas.listar_recebidas_pendentes(usuario_id)
        if visiveis is not None:
            pendentes = pendentes[:visiveis]
        return pendentes, total
