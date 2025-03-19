import re
import subprocess
import sys

def improve_transcript(text):
    """Melhora a qualidade da transcrição com pontuação e formatação usando spaCy."""
    if not text:
        return text
    
    print("\nAprimorando transcrição com spaCy...")
    return improve_transcript_advanced(text)

def improve_transcript_advanced(text):
    """Usa processamento de linguagem natural para aprimorar a transcrição."""
    try:
        import spacy
        print("Carregando modelo de linguagem spaCy...")
        
        # Verificar se o modelo está instalado
        try:
            nlp = spacy.load("pt_core_news_md")
        except OSError:
            print("Modelo spaCy para português (médio) não encontrado. Instalando...")
            subprocess.run([sys.executable, "-m", "spacy", "download", "pt_core_news_md"], check=True)
            nlp = spacy.load("pt_core_news_md")
        
        # Pré-processamento com regras básicas antes de usar o spaCy
        # Isso ajuda a fornecer algumas dicas ao segmentador do spaCy
        processed_text = text
        
        # Adicionar pontos temporários para ajudar na segmentação
        # Conectores comuns que geralmente separam frases
        connectors = ["porque", "portanto", "então", "assim", "contudo", "todavia", 
                      "entretanto", "porém", "mas", "e também", "além disso"]
        
        for connector in connectors:
            pattern = fr'\s+{connector}\s+'
            processed_text = re.sub(pattern, f'. {connector} ', processed_text, flags=re.IGNORECASE)
        
        # Manipular porcentagens para preservar sua integridade
        # Substituir temporariamente percentagens por marcadores especiais
        percentage_markers = {}
        percentage_pattern = r'(\d+(?:,\d+)?(?:\.\d+)?)\s*%'
        percentages = re.finditer(percentage_pattern, processed_text)
        
        for i, match in enumerate(percentages):
            marker = f"__PERCENTAGE_{i}__"
            percentage_markers[marker] = match.group(0)
            processed_text = processed_text.replace(match.group(0), marker)
        
        # Configurações personalizadas para segmentação de sentenças
        nlp.add_pipe("sentencizer")
        
        # Processar o texto pré-processado
        doc = nlp(processed_text)
        
        # Reconstruir o texto com pontuação adequada
        sentences = []
        for sent in doc.sents:
            # Limpar pontuação temporária que adicionamos
            sentence = sent.text.strip()
            sentence = re.sub(r'\.+', '.', sentence)
            
            # Capitalizar primeira letra
            if sentence:
                sentence = sentence[0].upper() + sentence[1:]
            
            # Verificar se termina com pontuação
            if sentence and sentence[-1] not in ['.', '!', '?']:
                # Verificar se é uma pergunta
                if any(qw in sentence.lower() for qw in ["quem", "qual", "quando", "onde", "como", "por que"]):
                    sentence += '?'
                else:
                    sentence += '.'
            
            sentences.append(sentence)
        
        # Juntar as sentenças
        improved_text = ' '.join(sentences)
        
        # Restaurar os marcadores de percentagem
        for marker, percentage in percentage_markers.items():
            improved_text = improved_text.replace(marker, percentage)
        
        # Pós-processamento
        # Corrigir espaços antes de pontuação
        improved_text = re.sub(r'\s+([.,;:!?])', r'\1', improved_text)
        
        # Remover pontuação duplicada
        improved_text = re.sub(r'([.,;:!?])\1+', r'\1', improved_text)
        
        # Corrigir problemas com percentuais
        improved_text = re.sub(r'%\s*\.', '%.', improved_text)
        improved_text = re.sub(r'%\.\s*,', '%, ', improved_text)
        
        return improved_text
        
    except ImportError:
        print("Biblioteca spaCy não encontrada. Instale com: pip install spacy")
        print("Retornando texto sem aprimoramento.")
        return text
