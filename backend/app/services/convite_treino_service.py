from datetime import datetime

from app.models.convite_treino import ConviteTreino
from app.models.usuario import Usuario
from app.repositories.academia_repository import AcademiaRepository
from app.repositories.convite_treino_repository import ConviteTreinoRepository
from app.services.match_service import MatchService


class NaoEhMatchError(Exception):
    pass


class AcademiaNaoEncontradaError(Exception):
    pass


class ConviteDuplicadoError(Exception):
    pass


class AgendamentoNaoEncontradoError(Exception):
    pass


class ConviteTreinoService:
    def __init__(self, convite_repository: ConviteTreinoRepository | None = None,
                 academia_repository: AcademiaRepository | None = None,
                 match_service: MatchService | None = None):
        self._convites = convite_repository or ConviteTreinoRepository()
        self._academias = academia_repository or AcademiaRepository()
        self._matches = match_service or MatchService()

    def enviar(self, remetente: Usuario, destinatario_id: int, data_hora: datetime,
               academia_id: int) -> ConviteTreino:
        if destinatario_id not in self._matches.ids_contatos_ativos(remetente.id):
            raise NaoEhMatchError("Você só pode convidar seus matches")
        if not self._academias.buscar_por_id(academia_id):
            raise AcademiaNaoEncontradaError("Academia não encontrada")

        convite = ConviteTreino(id=None, remetente_id=remetente.id, destinatario_id=destinatario_id,
                                academia_id=academia_id, agendado_para=data_hora)
        if self._convites.existe_pendente_no_horario(remetente.id, destinatario_id, data_hora):
            raise ConviteDuplicadoError("Já existe um convite pendente entre vocês nesse horário")
        return self._convites.criar(convite)

    def _buscar_do_usuario(self, usuario: Usuario, convite_id: int) -> ConviteTreino:
        convite = self._convites.buscar_por_id(convite_id)
        if not convite or not convite.envolve(usuario.id):
            raise AgendamentoNaoEncontradoError("Convite não encontrado")
        return convite

    def responder(self, usuario: Usuario, convite_id: int, aceitar: bool) -> ConviteTreino:
        convite = self._buscar_do_usuario(usuario, convite_id)
        if aceitar:
            convite.aceitar(usuario.id)
        else:
            convite.recusar(usuario.id)
        self._convites.salvar_status(convite)
        return convite

    def cancelar(self, usuario: Usuario, convite_id: int) -> ConviteTreino:
        convite = self._buscar_do_usuario(usuario, convite_id)
        convite.cancelar(usuario.id)
        self._convites.salvar_status(convite)
        return convite

    def listar(self, usuario_id: int) -> list[dict]:
        resultado = []
        for linha in self._convites.listar_do_usuario(usuario_id):
            convite = ConviteTreinoRepository.linha_para_convite(linha)
            resultado.append({
                "id": convite.id,
                "status": convite.status.value,
                "sou_remetente": convite.remetente_id == usuario_id,
                "agendado_para": convite.agendado_para,
                "passado": convite.eh_passado(),
                "academia": {"id": convite.academia_id, "nome": linha["academia_nome"]},
                "outro": {"id": linha["outro_id"], "nome": linha["outro_nome"],
                          "foto_url": linha["outro_foto_url"]},
            })
        return resultado

    def contar_pendentes_recebidos(self, usuario_id: int) -> int:
        return self._convites.contar_pendentes_recebidos(usuario_id)
