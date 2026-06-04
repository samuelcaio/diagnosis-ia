$loginBody = @{ email = "medico@clinica.com.br"; password = "senha123" } | ConvertTo-Json
$authResponse = Invoke-RestMethod -Uri "http://localhost:8080/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $authResponse.token
$headers = @{ Authorization = "Bearer $token" }

# Joao da Silva
$patientId = "e19df512-3ffb-4edd-8783-d402a9c92d47"

Write-Host "1. Testing e-SUS APS EMR Registration with AI Audit (USADA)..."

$esusPayload = @{
    identificacao = @{
        nome_completo = "Joao da Silva"
        cpf_anonimo = "ANONIMO (LGPD COMPLIANT)"
        data_nascimento = "2000-02-25"
        sexo = "MASCULINO"
        cns = "238.4982.3894.0019"
        nome_mae = "Maria Joana da Silva"
        endereco = "Rua das Flores, 123"
        telefone = "11988887777"
        microarea = "02"
        equipe_saude_familia = "Equipe Saude da Familia Ciano"
        agente_comunitario = "Mariana Silva"
    }
    acolhimento = @{
        data_hora = "2026-05-29T15:00:00Z"
        profissional_responsavel = "Dr. Carlos Oliveira"
        motivo_procura = "Consulta de Demanda Espontanea"
        demanda_tipo = "Espontanea"
        classificacao_risco = "Verde"
        queixa_principal = "Dor de ouvido constante."
    }
    triagem = @{
        pressao_arterial = "120/80"
        frequencia_cardiaca = 80
        frequencia_respiratoria = 18
        saturacao_o2 = 97
        temperatura = 37.8
        glicemia_capilar = 100
        antropometria = @{
            peso_kg = 72
            altura_cm = 175
            imc = 23.5
            circunferencia_abdominal = 86
        }
        escalas = @{
            dor = 4
            risco_cardiovascular = "Baixo"
            escore_fragilidade_idosos = "Nao Fragil"
        }
    }
    historico_clinico = @{
        condicoes_cronicas = @()
        alergias = @{
            medicamentos = ""
            alimentos = ""
            outros = ""
        }
        medicamentos_em_uso = @()
    }
    soap = @{
        subjetivo = "Queixa de dor de ouvido constante e febre."
        objetivo = "Otoscopia com hiperemia em membrana timpanica."
        avaliacao = @{
            problemas_identificados = "Otite Media Aguda"
            cid10 = "H66.0"
            ciap2 = "H71"
            hipotese_diagnostica = "OMA bacteriana"
            uso_ia_apoio_decisorio = "USADA"
        }
        plano = @{
            condutas = "Prescricao de amoxicilina e analgesicos."
            retorno = "Retorno em 10 dias."
        }
    }
    exame_fisico = @{
        estado_geral = "Bom estado geral."
        nivel_consciencia = "Lucido e orientado."
        hidratacao = "Corado e hidratado."
        sistemas = @{
            cardiovascular = "Regular."
            respiratorio = "Livre."
            gastrointestinal = "Livre."
            neurologico = "Livre."
            musculoesqueletico = "Livre."
            pele = "Livre."
        }
    }
    solicitacao_exames = @{
        exames_selecionados = @()
        outros_exames = ""
    }
    prescricao_eletronica = @{
        medicamentos_prescritos = @(
            @{ medicamento = "Amoxicilina 500mg"; posologia = "1 comp de 8h/8h"; dias = "7" }
        )
        orientacoes = "Concluir os 7 dias de antibiotico."
    }
    encaminhamentos = @{
        especialidade = ""
        prioridade = "Media"
        justificativa = ""
    }
    programas_aps = @()
    evolucao_meta = @{
        data = "29/05/2026"
        tipo = "CONSULTA APS E-SUS"
    }
    assinatura_digital = @{
        profissional_nome = "Dr. Carlos Oliveira"
        conselho_professional = "CRM/SP"
        conselho_numero = "123456"
        assinatura_icp_brasil = "ESUS-ICP-BR-SIG-TESTMOCKIA"
    }
} | ConvertTo-Json -Depth 100

try {
    $esusResponse = Invoke-RestMethod -Uri "http://localhost:8080/records/patient/$patientId/esus" -Method Post -Body $esusPayload -ContentType "application/json" -Headers $headers
    Write-Host "e-SUS APS EMR Registration Succeeded!"
    Write-Host "Record ID:" $esusResponse.id
} catch {
    Write-Host "e-SUS APS EMR Registration Failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error Response:" $reader.ReadToEnd()
    }
}

Write-Host "`n2. Verifying Timeline History contains the e-SUS EMR and parses AI usage..."
try {
    $timelineResponse = Invoke-RestMethod -Uri "http://localhost:8080/records/patient/$patientId/timeline" -Method Get -Headers $headers
    
    # Let's inspect the latest saved record content
    $latestEsus = $timelineResponse | Where-Object { $_.title -like "*e-SUS APS*" } | Select-Object -First 1
    
    if ($latestEsus) {
        Write-Host "Latest e-SUS record found!"
        Write-Host "Title:" $latestEsus.title
        
        # Parse content json to check the nested value
        $contentObj = $latestEsus.content | ConvertFrom-Json
        Write-Host "Stored AI Usage Mode:" $contentObj.soap.avaliacao.uso_ia_apoio_decisorio
        
        if ($contentObj.soap.avaliacao.uso_ia_apoio_decisorio -eq "USADA") {
            Write-Host "SUCCESS: AI usage mode correctly persisted in JSONB!" -ForegroundColor Green
        } else {
            Write-Host "ERROR: AI usage mode not matching expected value!" -ForegroundColor Red
        }
    } else {
        Write-Host "ERROR: Latest record not found!" -ForegroundColor Red
    }
} catch {
    Write-Host "Timeline fetch failed: $_"
}
