from app.database import get_cursor
from app.models.assinatura import Assinatura
from app.models.plano import Plano


class AssinaturaRepository:
    @staticmethod
    def _linha_para_assinatura(linha: dict) -> Assinatura:
        return Assinatura(
            id=linha["id"],
            usuario_id=linha["usuario_id"],
            plano=Plano.por_chave(linha["plano"]),
            iniciada_em=linha["iniciada_em"],
            expira_em=linha["expira_em"],
            cancelada_em=linha["cancelada_em"],
            cartao_final=linha["cartao_final"] or "",
            cartao_bandeira=linha["cartao_bandeira"] or "",
        )

    def buscar_ativa_por_usuario(self, usuario_id: int) -> Assinatura | None:
        with get_cursor() as cur:
            cur.execute(
                """SELECT * FROM assinaturas
                   WHERE usuario_id = %s AND cancelada_em IS NULL AND expira_em > NOW()
                   ORDER BY iniciada_em DESC LIMIT 1""",
                (usuario_id,),
            )
            linha = cur.fetchone()
        return self._linha_para_assinatura(linha) if linha else None

    def criar(self, assinatura: Assinatura) -> Assinatura:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO assinaturas
                       (usuario_id, plano, iniciada_em, expira_em, cartao_final, cartao_bandeira)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (assinatura.usuario_id, assinatura.plano.chave, assinatura.iniciada_em,
                 assinatura.expira_em, assinatura.cartao_final, assinatura.cartao_bandeira),
            )
            assinatura._id = cur.lastrowid
        return assinatura

    def cancelar_ativas_do_usuario(self, usuario_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """UPDATE assinaturas SET cancelada_em = NOW()
                   WHERE usuario_id = %s AND cancelada_em IS NULL AND expira_em > NOW()""",
                (usuario_id,),
            )
