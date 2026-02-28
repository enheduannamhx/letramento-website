# 🎨 Letramento Design System

> Sistema de design para o projeto de mapeamento de letramento digital.

---

## Filosofia

**Letramento** é sobre descobrir-se. Nosso design deve refletir:
- **Profundidade** — camadas de descoberta
- **Fluidez** — transição suave entre estados
- **Mistério** — convida à exploração
- **Autenticidade** — honestidade visual

---

## Princípios

### 1. Camadas de Descoberta
Cada elemento tem profundidade - literal e metafórica.

### 2. Fluidez
Animações que fluem como água - contínuas, não abruptas.

### 3. Mistério
Espaços em branco convidam à exploração sem sobrecarregar.

### 4. Feedback Instantâneo
Cada ação gera resposta visual/emocional.

---

## Cores

### Paleta Primária

```css
--color-midnight:     #0D0D1A;  /* Fundo principal */
--color-void:         #161625;  /* Fundo secundário */
--color-surface:       #1E1E32;  /* Cards, superfícies */
--color-elevated:     #2A2A44;  /* Hover states */
```

### Paleta de Acento

```css
--color-electric:     #7C3AED;  /* Roxo elétrica - Primária */
--color-neon:         #06B6D4;  /* Cyan neon - Secundária */
--color-aurora:       #10B981;  /* Verde aurora - Sucesso */
--color-sunset:       #F59E0B;  /* Laranja alerta - Atenção */
--color-pulse:        #EF4444;  /* Vermelho pulse - Erro */
--color-glow:         #8B5CF6;  /* Violeta glow - Destaque */
```

### Gradientes

```css
--gradient-primary:   linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
--gradient-aurora:   linear-gradient(135deg, #10B981 0%, #06B6D4 100%);
--gradient-void:     linear-gradient(180deg, #0D0D1A 0%, #161625 100%);
--gradient-glow:    radial-gradient(ellipse at center, #7C3AED33 0%, transparent 70%);
```

---

## Tipografia

### Família

**Headings:** `Outfit` (Google Fonts)
- Weight: 600-800
- Letterspacing: -0.02em

**Body:** `DM Sans` (Google Fonts)
- Weight: 400-500
- Letterspacing: 0

**Mono:** `JetBrains Mono`
- Código, dados

### Escala

```css
--text-xs:    0.75rem;    /* 12px */
--text-sm:    0.875rem;   /* 14px */
--text-base:  1rem;       /* 16px */
--text-lg:    1.125rem;   /* 18px */
--text-xl:    1.25rem;    /* 20px */
--text-2xl:   1.5rem;     /* 24px */
--text-3xl:   1.875rem;   /* 30px */
--text-4xl:   2.25rem;    /* 36px */
--text-5xl:   3rem;       /* 48px */
```

---

## Ícones

### Sistema de Ícones Custom

Desenvolvemos ícones únicos inspirados em:

1. **Linguagem** — símbolos de expressão
2. **Movimento** — icons que fluem
3. **Camada** — profundidade em 2D

### Ícones Principais

```
editor/           → ✏️ Caneta fluindo
coach/           → 💭 Pensamento com layers
stats/           → 📊 Gráfico orgânico
progress/        → 🌱 Crescimento orgânico
achievement/     → ✨ Brilho estelar
interaction/     → 🔗 Conexão pulsante
focus/           → 🎯 Alvo respirando
insight/         → 💎 Gema brilhando
time/            → ⏳ Ampulheta moderna
```

### Estilo

- **Stroke:** 1.5px - 2px
- **Bordas:** arredondadas (border-radius: 4px)
- **Animação:** hover com scale(1.1) + stroke-dashoffset
- **Cores:** gradientes quando ativos

---

## Componentes

### Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid #ffffff08;
  border-radius: 16px;
  box-shadow: 
    0 4px 24px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter: blur(12px);
}
```

### Botões

**Primary:**
```css
.btn-primary {
  background: var(--gradient-primary);
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5);
}
```

### Inputs

```css
.input {
  background: var(--color-void);
  border: 1px solid #ffffff10;
  border-radius: 12px;
  padding: 14px 18px;
  transition: all 0.2s ease;
}
.input:focus {
  border-color: var(--color-electric);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
}
```

---

## Animações

### Curvas

```css
--ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce:  cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-float:  cubic-bezier(0, 0.8, 1, 0.2);
```

### Durações

```css
--duration-instant:  100ms;
--duration-fast:      200ms;
--duration-normal:    300ms;
--duration-slow:     500ms;
--duration-glacial:   1000ms;
```

### Efeitos

1. **Pulse** — escala sutil + brilho
2. **Float** — movimento vertical contínuo
3. **Shimmer** — brilho passando
4. **Reveal** — entrada com opacidade + translate
5. **Morph** — transição de forma

---

## Espaçamento

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

---

## Sombras

```css
--shadow-sm:    0 2px 8px rgba(0,0,0,0.2);
--shadow-md:    0 4px 16px rgba(0,0,0,0.25);
--shadow-lg:    0 8px 32px rgba(0,0,0,0.3);
--shadow-glow: 0 0 40px rgba(124, 58, 237, 0.3);
--shadow-inner: inset 0 2px 4px rgba(0,0,0,0.2);
```

---

## Breakpoints

```css
--bp-sm:  640px;
--bp-md:  768px;
--bp-lg:  1024px;
--bp-xl:  1280px;
--bp-2xl: 1536px;
```

---

## Acessibilidade

- Contraste mínimo 4.5:1
- Foco visível com `outline-offset: 2px`
- Animações respectam `prefers-reduced-motion`
- Labels sempre presentes
- Estados: hover, focus, active, disabled, loading

---

## Usage

```html
<link rel="stylesheet" href="design-system/tokens.css">
<script src="design-system/components.js"></script>
```

---

_Last updated: 2026-02-26_
