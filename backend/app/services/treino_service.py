from app.models.dia_semana import DiaSemana
from app.models.usuario import Usuario
from app.services.checkin_service import CheckInService
from app.services.convite_treino_service import ConviteTreinoService
from app.services.match_service import MatchService
from app.services.plano_treino_service import PlanoTreinoService
from app.services.sessao_grupo_service import SessaoGrupoService


class TreinoService:
    """Fachada que junta, numa resposta só, tudo o que a tela de Treino precisa."""

    def __init__(self, plano_service: PlanoTreinoService | None = None,
                 checkin_service: CheckInService | None = None,
                 convite_service: ConviteTreinoService | None = None,
                 sessao_service: SessaoGrupoService | None = None,
                 match_service: MatchService | None = None):
        self._planos = plano_service or PlanoTreinoService()
        self._checkins = checkin_service or CheckInService()
        self._convites = convite_service or ConviteTreinoService()
        self._sessoes = sessao_service or SessaoGrupoService()
        self._matches = match_service or MatchService()

    def contar_pendentes(self, usuario_id: int) -> int:
        return (self._convites.contar_pendentes_recebidos(usuario_id)
                + self._sessoes.contar_pendentes_recebidos(usuario_id))

    def painel(self, usuario: Usuario) -> dict:
        checkin = self._checkins.obter(usuario.id)
        return {
            "hoje": DiaSemana.hoje().value,
            "plano": self._planos.obter_plano(usuario.id).to_list(),
            "checkin": checkin.to_dict() if checkin else None,
            "convites": self._convites.listar(usuario.id),
            "sessoes": self._sessoes.listar(usuario.id),
            "matches": self._matches.contatos_ativos(usuario.id),
            "pendentes_recebidos": self.contar_pendentes(usuario.id),
        }
