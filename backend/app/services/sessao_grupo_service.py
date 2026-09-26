from collections import defaultdict
from datetime import datetime

from app.models.sessao_grupo import MembroSessao, SessaoGrupo
from app.models.status_convite import PermissaoNegadaError
from app.models.usuario import Usuario
from app.repositories.academia_repository import AcademiaRepository
from app.repositories.sessao_grupo_repository import SessaoGrupoRepository
from app.services.convite_treino_service import (
    AcademiaNaoEncontradaError,
    AgendamentoNaoEncontradoError,
    NaoEhMatchError,
)
from app.services.match_service import MatchService


class SessaoGrupoService:
    def __init__(self, sessao_repository: SessaoGrupoRepository | None = None,
                 academia_repository: AcademiaRepository | None = None,
                 match_service: MatchService | None = None):
        self._sessoes = sessao_repository or SessaoGrupoRepository()
        self._academias = academia_repository or AcademiaRepository()
        self._matches = match_service or MatchService()

    def criar(self, criador: Usuario, membros_ids: list[int], data_hora: datetime,
              academia_id: int, descricao: str | None) -> SessaoGrupo:
        sessao = SessaoGrupo(
            id=None, criador_id=criador.id, academia_id=academia_id, agendada_para=data_hora,
            membros=[MembroSessao(usuario_id=uid) for uid in membros_ids], descricao=descricao,
        )
        contatos = self._matches.ids_contatos_ativos(criador.id)
        if any(uid not in contatos for uid in membros_ids):
            raise NaoEhMatchError("Só dá para chamar seus matches para o grupo")
        if not self._academias.buscar_por_id(academia_id):
            raise AcademiaNaoEncontradaError("Academia não encontrada")
        return self._sessoes.criar(sessao)

    def _buscar_do_usuario(self, usuario: Usuario, sessao_id: int) -> SessaoGrupo:
        sessao = self._sessoes.buscar_por_id(sessao_id)
        if not sessao or not sessao.participa(usuario.id):
            raise AgendamentoNaoEncontradoError("Sessão não encontrada")
        return sessao

    def responder(self, usuario: Usuario, sessao_id: int, aceitar: bool) -> None:
        sessao = self._buscar_do_usuario(usuario, sessao_id)
        membro = sessao.membro(usuario.id)
        if not membro:
            raise PermissaoNegadaError("Quem criou o grupo não precisa responder")
        if aceitar:
            membro.aceitar(usuario.id)
        else:
            membro.recusar(usuario.id)
        self._sessoes.salvar_membro(membro)

    def cancelar(self, usuario: Usuario, sessao_id: int) -> None:
        sessao = self._buscar_do_usuario(usuario, sessao_id)
        if not sessao.pode_cancelar(usuario.id):
            raise PermissaoNegadaError("Só quem criou o grupo pode cancelar")
        self._sessoes.deletar(sessao.id)

    def listar(self, usuario_id: int) -> list[dict]:
        linhas_sessoes, linhas_membros = self._sessoes.listar_futuras_do_usuario(usuario_id)

        membros_por_sessao: dict[int, list[dict]] = defaultdict(list)
        for linha in linhas_membros:
            membros_por_sessao[linha["sessao_id"]].append(linha)

        resultado = []
        for linha in linhas_sessoes:
            linhas_m = membros_por_sessao[linha["id"]]
            sessao = SessaoGrupoRepository.linha_para_sessao(
                linha, [SessaoGrupoRepository.linha_para_membro(m) for m in linhas_m]
            )
            meu_status = sessao.status_de(usuario_id)
            resultado.append({
                "id": sessao.id,
                "sou_criador": sessao.pode_cancelar(usuario_id),
                "meu_status": meu_status.value if meu_status else None,
                "agendada_para": sessao.agendada_para,
                "descricao": sessao.descricao,
                "academia": {"id": sessao.academia_id, "nome": linha["academia_nome"]},
                "criador": {"id": sessao.criador_id, "nome": linha["criador_nome"],
                            "foto_url": linha["criador_foto_url"]},
                "membros": [
                    {"id": m["usuario_id"], "nome": m["nome"], "foto_url": m["foto_url"], "status": m["status"]}
                    for m in linhas_m
                ],
                "confirmados": len(sessao.confirmados()),
                "total_pessoas": sessao.total_pessoas(),
            })
        return resultado

    def contar_pendentes_recebidos(self, usuario_id: int) -> int:
        return self._sessoes.contar_pendentes_recebidos(usuario_id)
