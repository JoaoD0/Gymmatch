from app.database import get_cursor
from app.models.perfil import Perfil


class PerfilRepository:
    @staticmethod
    def _linha_para_perfil(linha: dict) -> Perfil:
        return Perfil(
            usuario_id=linha["usuario_id"],
            bio=linha["bio"] or "",
            objetivo=linha["objetivo"],
            nivel=linha["nivel"],
            modalidades=Perfil.modalidades_de_csv(linha["modalidades"]),
            idade=linha["idade"],
            telefone=linha["telefone"] or "",
            cpf=linha["cpf"] or "",
            genero=linha["genero"],
            orientacao_sexual=linha["orientacao_sexual"] or "",
            procurando=linha["procurando"] or "amizade",
            aberto_a=Perfil.modalidades_de_csv(linha["aberto_a"]),
            mostrar_para=Perfil.modalidades_de_csv(linha["mostrar_para"]),
            quando_treina=Perfil.modalidades_de_csv(linha["quando_treina"]),
            divisao_treino=linha["divisao_treino"] or "",
            interesses=Perfil.modalidades_de_csv(linha["interesses"]),
            foto_url=linha["foto_url"],
            termos_aceitos_em=linha["termos_aceitos_em"],
            ocultar_objetivo=bool(linha["ocultar_objetivo"]),
            ocultar_orientacao=bool(linha["ocultar_orientacao"]),
            ocultar_horarios=bool(linha["ocultar_horarios"]),
            pr_supino=linha["pr_supino"],
            pr_agachamento=linha["pr_agachamento"],
            pr_terra=linha["pr_terra"],
            atualizado_em=linha["atualizado_em"],
        )

    def buscar_por_usuario(self, usuario_id: int) -> Perfil | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM perfis WHERE usuario_id = %s", (usuario_id,))
            linha = cur.fetchone()
        return self._linha_para_perfil(linha) if linha else None

    def buscar_varios_por_usuario(self, ids: list[int]) -> list[Perfil]:
        if not ids:
            return []
        placeholders = ",".join(["%s"] * len(ids))
        with get_cursor() as cur:
            cur.execute(f"SELECT * FROM perfis WHERE usuario_id IN ({placeholders})", tuple(ids))
            linhas = cur.fetchall()
        return [self._linha_para_perfil(l) for l in linhas]

    def salvar(self, perfil: Perfil) -> Perfil:
        """Cria ou atualiza (upsert) o perfil de um usuário."""
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO perfis (
                       usuario_id, bio, objetivo, nivel, modalidades, idade,
                       telefone, cpf, genero, orientacao_sexual, procurando,
                       aberto_a, mostrar_para, quando_treina, divisao_treino,
                       interesses, foto_url, termos_aceitos_em,
                       ocultar_objetivo, ocultar_orientacao, ocultar_horarios,
                       pr_supino, pr_agachamento, pr_terra
                   )
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                           %s, %s, %s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE
                       bio = VALUES(bio),
                       objetivo = VALUES(objetivo),
                       nivel = VALUES(nivel),
                       modalidades = VALUES(modalidades),
                       idade = VALUES(idade),
                       telefone = VALUES(telefone),
                       cpf = VALUES(cpf),
                       genero = VALUES(genero),
                       orientacao_sexual = VALUES(orientacao_sexual),
                       procurando = VALUES(procurando),
                       aberto_a = VALUES(aberto_a),
                       mostrar_para = VALUES(mostrar_para),
                       quando_treina = VALUES(quando_treina),
                       divisao_treino = VALUES(divisao_treino),
                       interesses = VALUES(interesses),
                       foto_url = VALUES(foto_url),
                       termos_aceitos_em = VALUES(termos_aceitos_em),
                       ocultar_objetivo = VALUES(ocultar_objetivo),
                       ocultar_orientacao = VALUES(ocultar_orientacao),
                       ocultar_horarios = VALUES(ocultar_horarios),
                       pr_supino = VALUES(pr_supino),
                       pr_agachamento = VALUES(pr_agachamento),
                       pr_terra = VALUES(pr_terra)""",
                (perfil.usuario_id, perfil.bio, perfil.objetivo, perfil.nivel,
                 perfil.modalidades_csv(), perfil.idade, perfil.telefone,
                 perfil.cpf or None, perfil.genero, perfil.orientacao_sexual,
                 perfil.procurando, perfil.aberto_a_csv(), perfil.mostrar_para_csv(),
                 perfil.quando_treina_csv(), perfil.divisao_treino, perfil.interesses_csv(),
                 perfil.foto_url, perfil.termos_aceitos_em,
                 perfil.ocultar_objetivo, perfil.ocultar_orientacao, perfil.ocultar_horarios,
                 perfil.pr_supino, perfil.pr_agachamento, perfil.pr_terra),
            )
        return perfil

    def salvar_foto_url(self, usuario_id: int, foto_url: str) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE perfis SET foto_url = %s WHERE usuario_id = %s",
                (foto_url, usuario_id),
            )
