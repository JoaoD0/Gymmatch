import os
from datetime import datetime

from app.models.denuncia import Denuncia
from app.models.move import DURACAO_MOVE, Move
from app.models.usuario import Usuario
from app.repositories.denuncia_repository import DenunciaRepository
from app.repositories.move_repository import MoveRepository

LIMITE_MOVES_ATIVOS = 10


class LimiteMovesAtivosError(Exception):
    pass


class MoveNaoEncontradoError(Exception):
    pass


class MoveNaoPertenceAoUsuarioError(Exception):
    pass


class DenunciarProprioMoveError(Exception):
    pass


class MoveService:
    def __init__(self, move_repository: MoveRepository | None = None,
                 denuncia_repository: DenunciaRepository | None = None):
        self._moves = move_repository or MoveRepository()
        self._denuncias = denuncia_repository or DenunciaRepository()

    def listar_para_usuario(self, usuario: Usuario) -> dict:
        linhas = self._moves.listar_visiveis_para(usuario.id, usuario.academia_id)

        meus: list[dict] = []
        grupos_map: dict[int, dict] = {}

        for linha in linhas:
            move = MoveRepository._linha_para_move(linha)
            item = move.to_dict()

            if move.usuario_id == usuario.id:
                meus.append(item)
            else:
                grupo = grupos_map.setdefault(move.usuario_id, {
                    "usuario": {
                        "id": move.usuario_id,
                        "nome": linha["autor_nome"],
                        "foto_url": linha["autor_foto_url"],
                    },
                    "moves": [],
                })
                grupo["moves"].append(item)

        grupos = sorted(grupos_map.values(), key=lambda g: g["moves"][-1]["criado_em"], reverse=True)
        return {"meus": meus, "grupos": grupos}

    def criar(self, usuario_id: int, texto: str, tag: str | None, foto_url: str) -> Move:
        if self._moves.contar_ativos_por_usuario(usuario_id) >= LIMITE_MOVES_ATIVOS:
            raise LimiteMovesAtivosError(f"Máximo de {LIMITE_MOVES_ATIVOS} moves ativos por usuário")

        texto_final = (texto or "").strip() or tag or "Treino de hoje"
        agora = datetime.now()
        move = Move(
            id=None, usuario_id=usuario_id, texto=texto_final, foto_url=foto_url,
            tag=tag, criado_em=agora, expira_em=agora + DURACAO_MOVE,
        )
        return self._moves.criar(move)

    def deletar(self, move_id: int, usuario_id: int) -> Move:
        move = self._moves.buscar_por_id(move_id)
        if not move:
            raise MoveNaoEncontradoError("Move não encontrado")
        if move.usuario_id != usuario_id:
            raise MoveNaoPertenceAoUsuarioError("Você só pode apagar seus próprios moves")
        self._moves.deletar(move_id)
        return move

    def denunciar(self, usuario_id: int, move_id: int) -> None:
        move = self._moves.buscar_por_id(move_id)
        if not move:
            raise MoveNaoEncontradoError("Move não encontrado")
        if move.usuario_id == usuario_id:
            raise DenunciarProprioMoveError("Não é possível denunciar o próprio move")

        self._denuncias.criar(Denuncia(
            id=None, denunciante_id=usuario_id, denunciado_id=move.usuario_id,
            motivo="comportamento_inadequado", move_id=move_id,
        ))

    def limpar_expirados(self, uploads_dir: str) -> int:
        """Apaga do banco e do disco os moves vencidos. Chamada na inicialização e a cada hora."""
        expirados = self._moves.listar_expirados()
        for move in expirados:
            caminho = os.path.join(uploads_dir, "moves", os.path.basename(move.foto_url))
            if os.path.isfile(caminho):
                os.remove(caminho)
            self._moves.deletar(move.id)
        return len(expirados)
