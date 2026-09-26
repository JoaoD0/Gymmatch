from app.database import get_cursor
from app.models.move import Move


class MoveRepository:
    @staticmethod
    def _linha_para_move(linha: dict) -> Move:
        return Move(
            id=linha["id"],
            usuario_id=linha["usuario_id"],
            texto=linha["texto"],
            foto_url=linha["foto_url"],
            tag=linha["tag"],
            criado_em=linha["criado_em"],
            expira_em=linha["expira_em"],
        )

    def criar(self, move: Move) -> Move:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO moves (usuario_id, texto, foto_url, tag, expira_em)
                   VALUES (%s, %s, %s, %s, %s)""",
                (move.usuario_id, move.texto, move.foto_url, move.tag, move.expira_em),
            )
            move._id = cur.lastrowid
        return move

    def buscar_por_id(self, move_id: int) -> Move | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM moves WHERE id = %s", (move_id,))
            linha = cur.fetchone()
        return self._linha_para_move(linha) if linha else None

    def contar_ativos_por_usuario(self, usuario_id: int) -> int:
        with get_cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS total FROM moves WHERE usuario_id = %s AND expira_em > NOW()",
                (usuario_id,),
            )
            return cur.fetchone()["total"]

    def listar_visiveis_para(self, usuario_id: int, academia_id: int | None) -> list[dict]:
        """Moves próprios (não expirados) + moves não expirados de gente ativa da mesma
        academia, sem bloqueio em nenhuma direção. Um único JOIN — sem N+1."""
        with get_cursor() as cur:
            cur.execute(
                """SELECT mv.*, u.nome AS autor_nome, p.foto_url AS autor_foto_url
                   FROM moves mv
                   INNER JOIN usuarios u ON u.id = mv.usuario_id
                   LEFT JOIN perfis p ON p.usuario_id = mv.usuario_id
                   WHERE mv.expira_em > NOW()
                     AND (
                         mv.usuario_id = %s
                         OR (
                             u.academia_id = %s
                             AND u.status = 'ativo'
                             AND NOT EXISTS (
                                 SELECT 1 FROM bloqueios b
                                 WHERE (b.bloqueador_id = %s AND b.bloqueado_id = mv.usuario_id)
                                    OR (b.bloqueador_id = mv.usuario_id AND b.bloqueado_id = %s)
                             )
                         )
                     )
                   ORDER BY mv.usuario_id, mv.criado_em ASC""",
                (usuario_id, academia_id, usuario_id, usuario_id),
            )
            return cur.fetchall()

    def deletar(self, move_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM moves WHERE id = %s", (move_id,))

    def listar_expirados(self) -> list[Move]:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM moves WHERE expira_em < NOW()")
            linhas = cur.fetchall()
        return [self._linha_para_move(l) for l in linhas]
