"""Cria (ou recria) os dados de demonstração do GymMatch.

Uso, com o back-end já rodando em http://127.0.0.1:8000:
    cd backend
    venv\\Scripts\\activate
    python scripts/seed_demo.py

O que faz:
- cria a academia "Iron Club Paulista" e 13 pessoas fictícias (rostos gerados por IA, em scripts/demo_fotos);
- usa a própria API do app para perfis, fotos, curtidas, matches, conversas, moves e treino
  (assim todas as regras de negócio são respeitadas);
- ajusta os horários no banco para parecer uso real ("18min", "2d"...).

Pode rodar de novo quantas vezes quiser: ele apaga só a demo anterior e recria tudo com horários atualizados.
Conta de apresentação: lucas.andrade@gymmatch.app / demo1234
"""
import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta

import mysql.connector
from dotenv import dotenv_values

sys.stdout.reconfigure(encoding="utf-8")

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOTOS = os.path.join(BACKEND, "scripts", "demo_fotos")
UPLOADS = os.path.join(BACKEND, "uploads")
API = os.getenv("GYMMATCH_API", "http://127.0.0.1:8000")
SENHA = "demo1234"
DOMINIO = "gymmatch.app"
ACADEMIA_NOME = "Iron Club Paulista"


# ---------- acesso à API ----------
def req(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(API + path, method=method, headers=headers,
                               data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(r) as resp:
            texto = resp.read().decode()
            return resp.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        return e.code, (json.loads(texto) if texto else None)
    except urllib.error.URLError:
        raise SystemExit(f"Não consegui falar com a API em {API}. O back-end está rodando (uvicorn app.main:app)?")


def ok(resultado, contexto):
    status, corpo = resultado
    if status >= 400:
        raise SystemExit(f"Erro em '{contexto}': {status} {corpo}")
    return corpo


def enviar_foto(path, token, arquivo, campos=None):
    fronteira = uuid.uuid4().hex
    partes = [f'--{fronteira}\r\nContent-Disposition: form-data; name="{n}"\r\n\r\n{v}\r\n'.encode()
              for n, v in (campos or {}).items()]
    with open(arquivo, "rb") as f:
        partes.append(f'--{fronteira}\r\nContent-Disposition: form-data; name="arquivo"; filename="foto.jpg"\r\n'
                      f"Content-Type: image/jpeg\r\n\r\n".encode() + f.read() + b"\r\n")
    partes.append(f"--{fronteira}--\r\n".encode())
    r = urllib.request.Request(API + path, method="POST", data=b"".join(partes),
                               headers={"Authorization": f"Bearer {token}",
                                        "Content-Type": f"multipart/form-data; boundary={fronteira}"})
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode())


def conectar_banco():
    env = dotenv_values(os.path.join(BACKEND, ".env"))
    return mysql.connector.connect(
        host=env.get("DB_HOST", "localhost"), port=int(env.get("DB_PORT", 3306)),
        user=env.get("DB_USER", "root"), password=env.get("DB_PASSWORD", ""),
        database=env.get("DB_NAME", "gymmatch"),
    )


# ---------- elenco ----------
PESSOAS = {
    "lucas": dict(nome="Lucas Andrade", idade=26, genero="masculino", nivel="intermediario", objetivo="hipertrofia",
                  procurando="parceiro_treino", aberto_a=["amizade"], modalidades=["Musculação", "Crossfit", "Corrida"],
                  quando_treina=["manha"], divisao="ABCD", interesses=["Nutrição", "Trilhas", "Música"], prs=(95, 130, 160),
                  bio="Treino de manhã antes do trabalho ☀️ Foco em hipertrofia, mas não dispenso um WOD. Sempre procurando parceiro pra puxar mais carga."),
    "camila": dict(nome="Camila Rocha", idade=24, genero="feminino", nivel="intermediario", objetivo="condicionamento",
                   procurando="parceiro_treino", aberto_a=["amizade"], modalidades=["Musculação", "Corrida"],
                   quando_treina=["manha"], divisao="ABC",
                   bio="Corredora de fim de semana, marombeira nos dias úteis 🏃‍♀️ Leg day é sagrado."),
    "rafael": dict(nome="Rafael Costa", idade=28, genero="masculino", nivel="avancado", objetivo="hipertrofia",
                   procurando="parceiro_treino", aberto_a=["amizade"], modalidades=["Musculação", "Boxe"],
                   quando_treina=["noite"], divisao="ABCDE", prs=(105, 150, 190),
                   bio="Supino é terapia. Treino à noite depois do expediente, bora dividir a barra?"),
    "juliana": dict(nome="Juliana Martins", idade=27, genero="feminino", nivel="iniciante", objetivo="saude",
                    procurando="amizade", aberto_a=["parceiro_treino"], modalidades=["Crossfit", "Yoga"],
                    quando_treina=["tarde", "noite"], divisao="Full Body",
                    bio="2 meses de crossfit e já viciada 😅 Yoga pra equilibrar o caos."),
    "beatriz": dict(nome="Beatriz Lima", idade=23, genero="feminino", nivel="intermediario", objetivo="emagrecer",
                    procurando="romance", aberto_a=["amizade"], modalidades=["Musculação", "HIIT"],
                    quando_treina=["noite"], divisao="Superior/Inferior",
                    bio="Estudante de nutrição 🥗 Pergunta de dieta eu respondo, pergunta de cardio eu fujo."),
    "mariana": dict(nome="Mariana Alves", idade=25, genero="feminino", nivel="intermediario", objetivo="hipertrofia",
                    procurando="romance", aberto_a=["parceiro_treino"], modalidades=["Musculação", "Calistenia"],
                    quando_treina=["manha", "tarde"], divisao="ABC",
                    bio="Glúteo em construção 🚧 Café antes do treino, açaí depois."),
    "thiago": dict(nome="Thiago Nunes", idade=29, genero="masculino", nivel="avancado", objetivo="condicionamento",
                   procurando="parceiro_treino", aberto_a=["amizade"], modalidades=["Corrida", "Natação", "Crossfit"],
                   quando_treina=["manha"], divisao="Outro",
                   bio="Treinando pro meu primeiro triathlon 🏊‍♂️🚴‍♂️🏃‍♂️ Aceito dicas e companhia no longão de domingo."),
    "larissa": dict(nome="Larissa Souza", idade=26, genero="feminino", nivel="avancado", objetivo="condicionamento",
                    procurando="amizade", aberto_a=["parceiro_treino"], modalidades=["HIIT", "Crossfit", "Boxe"],
                    quando_treina=["tarde"], divisao="Full Body",
                    bio="Coach de HIIT nas horas vagas 🔥 Se me vir treinando, vem junto!"),
    "pedro": dict(nome="Pedro Henrique", idade=22, genero="masculino", nivel="iniciante", objetivo="hipertrofia",
                  procurando="amizade", aberto_a=["parceiro_treino"], modalidades=["Musculação"],
                  quando_treina=["noite"], divisao="ABC",
                  bio="Começando agora na academia, bora evoluir junto? 💪"),
    "fernanda": dict(nome="Fernanda Oliveira", idade=25, genero="feminino", nivel="intermediario", objetivo="saude",
                     procurando="romance", aberto_a=["amizade"], modalidades=["Yoga", "Natação"],
                     quando_treina=["manha"], divisao="Full Body",
                     bio="Yoga de manhã, natação no fim da tarde 🧘‍♀️ Paz na mente, força no corpo."),
    "aline": dict(nome="Aline Santos", idade=30, genero="feminino", nivel="avancado", objetivo="hipertrofia",
                  procurando="parceiro_treino", aberto_a=["amizade"], modalidades=["Musculação", "Calistenia"],
                  quando_treina=["tarde"], divisao="ABCD",
                  bio="Personal trainer 🏋️‍♀️ Barra fixa é meu esporte favorito. Bora de desafio?"),
    "gabriel": dict(nome="Gabriel Ferreira", idade=24, genero="masculino", nivel="intermediario", objetivo="condicionamento",
                    procurando="amizade", aberto_a=["parceiro_treino"], modalidades=["Crossfit", "Corrida"],
                    quando_treina=["manha", "noite"], divisao="Superior/Inferior",
                    bio="WOD de manhã, 5km à noite. Café preto e playlist de rock ⚡"),
    "isabela": dict(nome="Isabela Rezende", idade=23, genero="feminino", nivel="iniciante", objetivo="emagrecer",
                    procurando="amizade", aberto_a=["parceiro_treino"], modalidades=["Musculação", "Yoga"],
                    quando_treina=["tarde"], divisao="ABC",
                    bio="Primeiro mês de academia 🌱 Ainda descobrindo como usa metade dos aparelhos."),
}


def email_de(chave):
    partes = PESSOAS[chave]["nome"].lower().split()
    return f"{partes[0]}.{partes[-1]}@{DOMINIO}"


# ---------- 0. apaga a demo anterior (só ela) ----------
def apagar_demo_anterior(db):
    cur = db.cursor(dictionary=True)
    emails = [email_de(c) for c in PESSOAS]
    marcadores = ", ".join(["%s"] * len(emails))
    cur.execute(f"SELECT id FROM usuarios WHERE email IN ({marcadores})", emails)
    ids = [l["id"] for l in cur.fetchall()]
    if ids:
        m = ", ".join(["%s"] * len(ids))
        arquivos = []
        for sql in (f"SELECT foto_url AS u FROM perfis WHERE usuario_id IN ({m})",
                    f"SELECT url AS u FROM fotos_perfil WHERE usuario_id IN ({m})",
                    f"SELECT foto_url AS u FROM moves WHERE usuario_id IN ({m})",
                    f"SELECT foto_url AS u FROM posts WHERE autor_id IN ({m})"):
            cur.execute(sql, ids)
            arquivos += [l["u"] for l in cur.fetchall() if l["u"]]
        cur.execute(f"DELETE FROM usuarios WHERE id IN ({m})", ids)  # o resto sai pelo ON DELETE CASCADE
        for url in arquivos:
            caminho = os.path.join(UPLOADS, *url.replace("/uploads/", "").split("/"))
            if os.path.isfile(caminho):
                os.remove(caminho)
    # a academia só sai se ficou vazia (alguém de fora da demo pode ter entrado nela)
    cur.execute("""DELETE FROM academias WHERE nome = %s
                   AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.academia_id = academias.id)""", (ACADEMIA_NOME,))
    db.commit()
    print(f"demo anterior removida ({len(ids)} contas)" if ids else "nenhuma demo anterior")


def main():
    db = conectar_banco()
    apagar_demo_anterior(db)

    # ---------- 1. academia e contas ----------
    ok(req("POST", "/auth/cadastro", {"nome": PESSOAS["lucas"]["nome"], "email": email_de("lucas"), "senha": SENHA}), "cadastro lucas")
    token_lucas = ok(req("POST", "/auth/login", {"email": email_de("lucas"), "senha": SENHA}), "login lucas")["token"]
    existente = next((a for a in ok(req("GET", "/academias"), "listar academias") if a["nome"] == ACADEMIA_NOME), None)
    academia = existente["id"] if existente else ok(req("POST", "/academias", {
        "nome": ACADEMIA_NOME, "endereco": "Av. Paulista, 1500 — São Paulo"}, token_lucas), "criar academia")["id"]

    T, ID = {}, {}
    for chave, p in PESSOAS.items():
        if chave != "lucas":
            ok(req("POST", "/auth/cadastro", {"nome": p["nome"], "email": email_de(chave), "senha": SENHA, "academia_id": academia}), f"cadastro {chave}")
        login = ok(req("POST", "/auth/login", {"email": email_de(chave), "senha": SENHA}), f"login {chave}")
        T[chave], ID[chave] = login["token"], login["usuario"]["id"]
        ok(req("POST", f"/academias/{academia}/entrar", None, T[chave]), f"academia {chave}")
        supino, agachamento, terra = p.get("prs", (None, None, None))
        ok(req("PUT", "/perfil/me", {
            "bio": p["bio"], "objetivo": p["objetivo"], "nivel": p["nivel"], "modalidades": p["modalidades"],
            "idade": p["idade"], "genero": p["genero"], "procurando": p["procurando"], "aberto_a": p["aberto_a"],
            "mostrar_para": ["masculino", "feminino"], "quando_treina": p["quando_treina"], "divisao_treino": p["divisao"],
            "interesses": p.get("interesses", []), "aceitar_termos": True,
            "pr_supino": supino, "pr_agachamento": agachamento, "pr_terra": terra,
        }, T[chave]), f"perfil {chave}")
        enviar_foto("/perfil/me/foto", T[chave], os.path.join(FOTOS, f"{chave}.jpg"))
    print(f"13 contas criadas na academia '{ACADEMIA_NOME}'")

    ok(req("POST", "/planos/assinar", {"plano": "gold", "cartao_final": "4242", "cartao_bandeira": "Visa"}, T["lucas"]), "plano gold")

    # ---------- 2. curtidas e matches ----------
    def curtir(de, para):
        return ok(req("POST", "/discover/curtir", {"para_usuario_id": ID[para]}, T[de]), f"curtir {de}->{para}")

    match = {}
    for outro in ["camila", "rafael", "juliana", "beatriz"]:
        curtir(outro, "lucas")
        match[outro] = curtir("lucas", outro)["match_id"]
    curtir("rafael", "juliana")
    curtir("juliana", "rafael")
    for fa in ["mariana", "thiago"]:
        curtir(fa, "lucas")

    # ---------- 3. conversas (autor, texto, minutos atrás) ----------
    conversas = {
        "camila": [
            ("camila", "Oi Lucas! Vi que você também treina de manhã cedo 😄", 2 * 24 * 60),
            ("lucas", "Oi Camila! Sim, chego umas 6h30, antes do trabalho", 2 * 24 * 60 - 12),
            ("camila", "Que coragem kkkk eu vou às 7h. Qual sua divisão de treino?", 2 * 24 * 60 - 30),
            ("lucas", "ABCD. Hoje foi dia de costas, saí destruído 😅", 26 * 60),
            ("camila", "Amanhã é perna pra mim, topa treinar junto? Te mandei o convite lá no Treino 🏋️‍♀️", 40),
        ],
        "rafael": [
            ("rafael", "Fala mano! Bora fechar aquele treino de peito segunda?", 5 * 24 * 60),
            ("lucas", "Bora! 18h30 tá bom pra você?", 5 * 24 * 60 - 20),
            ("rafael", "Fechado. Já aceitei o convite 💪", 4 * 24 * 60),
            ("lucas", "Show, vou tentar bater 100 no supino", 6 * 60),
            ("rafael", "Se bater eu pago o açaí kkkk", 3 * 60),
        ],
        "juliana": [
            ("juliana", "Oi! Curti suas fotos, você faz crossfit também?", 3 * 24 * 60),
            ("lucas", "Faço sim, 2x por semana! E você?", 3 * 24 * 60 - 45),
            ("juliana", "Comecei faz 2 meses, ainda apanhando dos burpees 😂", 3 * 24 * 60 - 60),
            ("lucas", "Todo mundo apanha kkk, com o tempo melhora", 2 * 24 * 60),
            ("lucas", "Se quiser treinar junto um dia, é só chamar!", 20 * 60),
        ],
    }
    horarios_msg = []
    for outro, linhas in conversas.items():
        for autor, texto, minutos in linhas:
            m = ok(req("POST", f"/chat/{match[outro]}/mensagens", {"texto": texto}, T[autor]), f"mensagem {outro}")
            horarios_msg.append((m["id"], minutos))

    # ---------- 4. treino do Lucas ----------
    hoje = datetime.now().date()
    dias = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]
    plano = {"seg": "Peito e tríceps", "ter": "Costas e bíceps", "qua": "Pernas completo", "qui": "Ombros e abdômen",
             "sex": "Full body", "sab": "Cardio leve + mobilidade", "dom": ""}
    for dia, desc in plano.items():
        ok(req("PUT", f"/treino/plano/{dia}", {"descricao": desc}, T["lucas"]), f"plano {dia}")
    exercicios = {
        "seg": [("Supino reto", 4, 10), ("Supino inclinado halter", 3, 12), ("Crucifixo", 3, 12), ("Tríceps corda", 4, 12)],
        "qua": [("Agachamento livre", 4, 8), ("Leg press", 4, 12), ("Cadeira extensora", 3, 15), ("Stiff", 3, 10)],
    }
    exercicios.setdefault(dias[hoje.weekday()], []).extend(
        [("Esteira inclinada", None, 20), ("Alongamento de posterior", 3, None), ("Prancha", 3, 45)])
    for dia, lista in exercicios.items():
        for nome, series, reps in lista:
            ok(req("POST", "/treino/exercicios", {"dia": dia, "nome": nome, "series": series, "reps": reps}, T["lucas"]), f"exercício {nome}")

    def em(dias_a_frente, hora, minuto=0):
        return (datetime.combine(hoje + timedelta(days=dias_a_frente), datetime.min.time())
                .replace(hour=hora, minute=minuto).strftime("%Y-%m-%dT%H:%M"))

    segunda = (7 - hoje.weekday()) % 7 or 7
    ok(req("POST", "/treino/convites", {"destinatario_id": ID["lucas"], "agendado_para": em(1, 7, 30), "academia_id": academia}, T["camila"]), "convite camila")
    c = ok(req("POST", "/treino/convites", {"destinatario_id": ID["rafael"], "agendado_para": em(segunda, 18, 30), "academia_id": academia}, T["lucas"]), "convite rafael")
    ok(req("POST", f"/treino/convites/{c['id']}/aceitar", None, T["rafael"]), "rafael aceita")
    c = ok(req("POST", "/treino/convites", {"destinatario_id": ID["juliana"], "agendado_para": em(2, 17), "academia_id": academia}, T["lucas"]), "convite juliana")
    ok(req("POST", f"/treino/convites/{c['id']}/aceitar", None, T["juliana"]), "juliana aceita")
    s = ok(req("POST", "/treino/sessoes", {"membros_ids": [ID["lucas"], ID["juliana"]], "agendada_para": em(segunda + 1, 19),
                                            "academia_id": academia, "descricao": "Pernas + cardio, quem chegar primeiro pega o rack 😂"}, T["rafael"]), "grupo")
    ok(req("POST", f"/treino/sessoes/{s['id']}/aceitar", None, T["juliana"]), "juliana no grupo")

    # ---------- 5. check-in, boost e moves ----------
    ok(req("POST", "/treino/checkin", {"publicar_no_feed": False}, T["larissa"]), "check-in larissa")
    ok(req("POST", "/perfil/me/boost", None, T["pedro"]), "boost pedro")
    moves = [("lucas", "Costas feito ✅", "Costas", 3 * 60), ("rafael", "100kg no supino finalmente!!", "Novo PR!", 5 * 60),
             ("camila", "Leg day começando 🔥", "Pernas", 2 * 60), ("larissa", "Bora que hoje tem HIIT", "Treino de hoje", 30)]
    horarios_moves = []
    for autor, texto, tag, minutos in moves:
        mv = enviar_foto("/moves", T[autor], os.path.join(FOTOS, f"{autor}.jpg"), {"texto": texto, "tag": tag})
        horarios_moves.append((mv["id"], minutos))

    # ---------- 6. feed e horários (direto no banco) ----------
    agora = datetime.now()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT autor_id, texto FROM posts WHERE academia_id = %s AND tipo = 'pr'", (academia,))
    recordes = {l["autor_id"]: l["texto"] for l in cur.fetchall()}

    # o Feed ordena pelo id: os posts entram do mais antigo para o mais novo (autor, tipo, texto, minutos atrás, quem curte)
    posts = [
        ("lucas", "pr", recordes[ID["lucas"]], 2 * 24 * 60 + 180, ["rafael", "camila", "aline"]),
        ("pedro", "manual", "Alguém sabe se o horário de domingo mudou? Cheguei 8h e ainda tava fechada 😅", 2 * 24 * 60, ["isabela"]),
        ("juliana", "manual", "Primeiro muscle-up da vida!!! Dois meses de crossfit e finalmente saiu 😭🙌", 30 * 60,
         ["lucas", "rafael", "aline", "larissa", "camila", "isabela", "gabriel", "fernanda"]),
        ("aline", "manual", "Desafio da semana na barra fixa: quem fizer 10 pull-ups seguidas ganha minha planilha de costas 😏", 24 * 60,
         ["rafael", "thiago", "lucas"]),
        ("lucas", "manual", "30 dias seguidos de treino 🔥 Obrigado a quem me aguentou falando disso a semana inteira kkk", 7 * 60,
         ["camila", "juliana", "rafael", "gabriel", "aline", "beatriz", "thiago"]),
        ("gabriel", "manual", "Dica pra quem tá começando: grava a execução pelo celular de vez em quando. Mudou meu agachamento completamente 📱",
         5 * 60, ["thiago", "pedro", "isabela", "lucas"]),
        ("rafael", "pr", recordes[ID["rafael"]], 4 * 60, ["lucas", "juliana", "aline", "gabriel", "larissa"]),
        ("camila", "manual", "Alguém topa um treino de perna amanhã cedo? 🦵 Prometo não reclamar do búlgaro (mentira)", 60,
         ["lucas", "rafael", "mariana"]),
        ("larissa", "checkin", "Chegou na academia 💪", 18, ["gabriel", "aline"]),
    ]
    cur.execute("DELETE FROM posts WHERE academia_id = %s", (academia,))
    for autor, tipo, texto, minutos, curtidores in posts:
        cur.execute("INSERT INTO posts (autor_id, academia_id, tipo, texto, criado_em) VALUES (%s, %s, %s, %s, %s)",
                    (ID[autor], academia, tipo, texto, agora - timedelta(minutes=minutos)))
        post_id = cur.lastrowid
        for quem in curtidores:
            cur.execute("INSERT INTO curtidas_post (post_id, usuario_id) VALUES (%s, %s)", (post_id, ID[quem]))

    for mid, minutos in horarios_msg:
        cur.execute("UPDATE mensagens SET criado_em = %s WHERE id = %s", (agora - timedelta(minutes=minutos), mid))
    for outro, quando in {"camila": timedelta(days=2, hours=1), "rafael": timedelta(days=5, hours=1),
                          "juliana": timedelta(days=3, hours=1), "beatriz": timedelta(minutes=55)}.items():
        cur.execute("UPDATE matches SET criado_em = %s WHERE id = %s", (agora - quando, match[outro]))
    for mvid, minutos in horarios_moves:
        criado = agora - timedelta(minutes=minutos)
        cur.execute("UPDATE moves SET criado_em = %s, expira_em = %s WHERE id = %s", (criado, criado + timedelta(hours=24), mvid))
    cur.execute("UPDATE checkins SET feito_em = %s WHERE usuario_id = %s", (agora - timedelta(minutes=18), ID["larissa"]))
    db.commit()
    db.close()

    print("\nPronto! Entre no app com:")
    print(f"  e-mail: {email_de('lucas')}")
    print(f"  senha:  {SENHA}")
    print("As outras 12 contas usam a mesma senha (nome.sobrenome@gymmatch.app).")
    print("Moves somem em 24h, o check-in dura 3h e o boost 1h: rode de novo perto da apresentação.")


if __name__ == "__main__":
    main()
