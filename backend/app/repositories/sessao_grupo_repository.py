from app.database import get_connection, get_cursor
from app.models.sessao_grupo import MembroSessao, SessaoGrupo


class SessaoGrupoRepository:
    @staticmethod
    def linha_para_sessao(linha: dict, membros: list[MembroSessao]) -> SessaoGrupo:
        return SessaoGrupo(
            id=linha["id"],
            criador_id=linha["criador_id"],
            academia_id=linha["academia_id"],
            agendada_para=linha["agendada_para"],
            membros=membros,
            descricao=linha["descricao"],
            criado_em=linha["criado_em"],
        )

    @staticmethod
    def linha_para_membro(linha: dict) -> MembroSessao:
        return MembroSessao(
            sessao_id=linha["sessao_id"],
            usuario_id=linha["usuario_id"],
            status=linha["status"],
            respondido_em=linha["respondido_em"],
        )

    def criar(self, sessao: SessaoGrupo) -> SessaoGrupo:
        """Grava a sessão e os membros na mesma transação: ou entra tudo, ou nada."""
        with get_connection() as conn:
            cur = conn.cursor()
            try:
                conn.start_transaction()
                cur.execute(
                    """INSERT INTO sessoes_grupo (criador_id, academia_id, agendada_para, descricao)
                       VALUES (%s, %s, %s, %s)""",
                    (sessao.criador_id, sessao.academia_id, sessao.agendada_para, sessao.descricao),
                )
                sessao_id = cur.lastrowid
                cur.executemany(
                    "INSERT INTO sessao_membros (sessao_id, usuario_id, status) VALUES (%s, %s, %s)",
                    [(sessao_id, m.usuario_id, m.status.value) for m in sessao.membros],
                )
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                cur.close()
        sessao._id = sessao_id
        return sessao

    def buscar_por_id(self, sessao_id: int) -> SessaoGrupo | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM sessoes_grupo WHERE id = %s", (sessao_id,))
            linha = cur.fetchone()
            if not linha:
                return None
            cur.execute("SELECT * FROM sessao_membros WHERE sessao_id = %s", (sessao_id,))
            membros = [self.linha_para_membro(m) for m in cur.fetchall()]
        return self.linha_para_sessao(linha, membros)

    def salvar_membro(self, membro: MembroSessao) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE sessao_membros SET status = %s, respondido_em = %s WHERE sessao_id = %s AND usuario_id = %s",
                (membro.status.value, membro.respondido_em, membro.sessao_id, membro.usuario_id),
            )

    def deletar(self, sessao_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM sessoes_grupo WHERE id = %s", (sessao_id,))

    def listar_futuras_do_usuario(self, usuario_id: int) -> tuple[list[dict], list[dict]]:
        """Sessões futuras em que o usuário é criador ou membro (menos as que ele recusou).

        Duas queries: as sessões (com criador e academia) e todos os membros delas (com nome e foto).
        """
        with get_cursor() as cur:
            cur.execute(
                """SELECT s.*, a.nome AS academia_nome,
                          u.nome AS criador_nome, p.foto_url AS criador_foto_url
                   FROM sessoes_grupo s
                   JOIN academias a ON a.id = s.academia_id
                   JOIN usuarios u ON u.id = s.criador_id
                   LEFT JOIN perfis p ON p.usuario_id = u.id
                   WHERE s.agendada_para > NOW()
                     AND (s.criador_id = %s OR EXISTS (
                          SELECT 1 FROM sessao_membros me
                          WHERE me.sessao_id = s.id AND me.usuario_id = %s AND me.status <> 'recusado'))
                   ORDER BY s.agendada_para ASC, s.id ASC""",
                (usuario_id, usuario_id),
            )
            sessoes = cur.fetchall()
            if not sessoes:
                return [], []

            ids = [s["id"] for s in sessoes]
            marcadores = ", ".join(["%s"] * len(ids))
            cur.execute(
                f"""SELECT m.*, u.nome, p.foto_url
                    FROM sessao_membros m
                    JOIN usuarios u ON u.id = m.usuario_id
                    LEFT JOIN perfis p ON p.usuario_id = u.id
                    WHERE m.sessao_id IN ({marcadores})
                    ORDER BY m.sessao_id, u.nome""",
                ids,
            )
            membros = cur.fetchall()
        return sessoes, membros

    def contar_pendentes_recebidos(self, usuario_id: int) -> int:
        with get_cursor() as cur:
            cur.execute(
                """SELECT COUNT(*) AS total
                   FROM sessao_membros m JOIN sessoes_grupo s ON s.id = m.sessao_id
                   WHERE m.usuario_id = %s AND m.status = 'pendente' AND s.agendada_para > NOW()""",
                (usuario_id,),
            )
            return cur.fetchone()["total"]
