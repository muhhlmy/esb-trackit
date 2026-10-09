# Wireframe: Consistent Form Components

## Design Philosophy Creation

### NAME THE MOVEMENT
**Modular Consistency**

### ARTICULATE THE PHILOSOPHY (4-6 paragraphs)

To capture the VISUAL essence, express how the philosophy manifests through:
- Space and form
- Color and material
- Scale and rhythm
- Composition and balance
- Visual hierarchy

The Modular Consistency philosophy emphasizes creating UI components that are structurally sound, visually harmonious, and intentionally designed to work together as a cohesive system. Rather than relying on templated defaults or AI-generated approximations, this philosophy stresses expert craftsmanship in every pixel, spacing decision, and interaction detail.

Space and form are treated as active communicators of information, not passive containers. Each component considers its spatial relationship to neighboring elements, using consistent spacing scales to create rhythm and visual flow. Forms are designed with clear visual hierarchy that guides the user's eye naturally from labels to inputs to feedback messages.

Color and material are used deliberately to convey meaning and state, not merely as decoration. The philosophy insists on using the established design system tokens to ensure consistency across the application, while allowing for meaningful variation when communicating different states or importance levels.

Scale and rhythm create a visual language that users can learn and predict. Consistent typography scales, spacing scales, and interaction rhythms allow users to develop muscle memory and navigate the interface with confidence. This philosophy rejects chaotic variation in favor of intentional, patterned repetition that feels both familiar and fresh.

Composition and balance ensure that each component feels intentional and well-proportioned. Rather than cramming elements together or leaving awkward gaps, this philosophy seeks the sweet spot of visual density that communicates information clearly without overwhelming the user. Visual hierarchy is established through deliberate sizing, weighting, and spacing decisions that guide the user's attention to the most important elements first.

Visual hierarchy communicates information structure through deliberate design choices. The most important information (like field labels and input controls) receives appropriate visual weight, while secondary information (like helper text) is visually subordinated. This creates a clear information architecture that users can intuitively understand without conscious effort.

### CRITICAL GUIDELINES:
- **Avoid redundancy**: Each design aspect should be mentioned once. Avoid repeating points about color theory, spatial relationships, or typographic principles unless adding new depth.
- **Emphasize craftsmanship REPEATEDLY**: The philosophy MUST stress multiple times that the final work should appear as though it took countless hours to create, was labored over with care, and comes from someone at the absolute top of their field. This framing is essential - repeat phrases like "meticulously crafted," "the product of deep expertise," "painstaking attention," "master-level execution."
- **Leave creative space**: Remain specific about the aesthetic direction, but concise enough that the next Claude has room to make interpretive choices also at a extremely high level of craftmanship.

The philosophy must guide the next version to express ideas VISUALLY, not through text. Information lives in design, not paragraphs.

### PHILOSOPHY EXAMPLES
**"Modular Consistency"**
Philosophy: Creating UI components that are structurally sound, visually harmonious, and intentionally designed to work together as a cohesive system through expert craftsmanship and deliberate design choices.

Visual expression: Consistent spacing scales creating rhythmic vertical flow, deliberate typographic hierarchy guiding visual attention, purposeful use of color to convey state and meaning, balanced proportions that feel intentional rather than accidental, and micro-interactions that provide clear feedback without being distracting. Every alignment, every pixel, every timing decision reveals the work of countless refinements by someone at the top of their field.

### ESSENTIAL PRINCIPLES
- **VISUAL PHILOSOPHY**: Create an aesthetic worldview to be expressed through design
- **MINIMAL TEXT**: Always emphasize that text is sparse, essential-only, integrated as visual element - never lengthy
- **SPATIAL EXPRESSION**: Ideas communicate through space, form, color, composition - not paragraphs
- **ARTISTIC FREEDOM**: The next Claude interprets the philosophy visually - provide creative room
- **PURE DESIGN**: This is about making ART OBJECTS, not documents with decoration
- **EXPERT CRAFTSMANSHIP**: Repeatedly emphasize the final work should appear as though it took countless hours to create, was labored over with care, and comes from someone at the absolute top of their field

The design philosophy should be 4-6 paragraphs long. Fill it with poetic design philosophy that brings together the core vision. Avoid repeating the same points. Keep the design philosophy generic without mentioning the intention of the art, as if it can be used wherever. Output the design philosophy as a .md file.

## CANVAS CREATION

With both the philosophy and the conceptual framework established, express it on a canvas. Take a moment to gather thoughts and clear the mind. Use the design philosophy created and the instructions below to craft a masterpiece, embodying all aspects of the philosophy with expert craftsmanship.

To create museum or magazine quality work, use the design philosophy as the foundation. Create one single page, highly visual, design-forward PDF or PNG output (unless asked for more pages). Generally use repeating patterns and perfect shapes. Treat the abstract philosophical design as if it were a scientific bible, borrowing the visual language of systematic observation—dense accumulation of marks, repeated elements, or layered patterns that build meaning through patient repetition and reward sustained viewing. Add sparse, clinical typography and systematic reference markers that suggest this could be a diagram from an imaginary discipline, treating the invisible subject with the same reverence typically reserved for documenting observable phenomena. Anchor the piece with simple phrase(s) or details positioned subtly, using a limited color palette that feels intentional and cohesive. Embrace the paradox of using analytical visual language to express ideas about human experience: the result should be an artifact that proves something ephemeral can be studied, mapped, and understood through careful attention. This is true art. 

Text as a contextual element: Text is always minimal and visual-first, but let context guide whether that means whisper-quiet labels or bold typographic gestures. A punk venue poster might have larger, more aggressive type than a minimalist ceramics studio identity. Most of the time, font should be thin. All use of fonts must be design-forward and prioritize visual communication. Regardless of text scale, nothing falls off the page and nothing overlaps. Every element must be contained within the canvas boundaries with proper margins. Check carefully that all text, graphics, and visual elements have breathing room and clear separation. This is non-negotiable for professional execution. **IMPORTANT: Use different fonts if writing text. Search the `./canvas-fonts` directory. Regardless of approach, sophistication is non-negotiable.**

Download and use whatever fonts are needed to make this a reality. Get creative by making the typography actually part of the art itself -- if the art is abstract, bring the font onto the canvas, not typeset digitally.

To push boundaries, follow design instinct/intuition while using the philosophy as a guiding principle. Embrace ultimate design freedom and choice. Push aesthetics and design to the frontier. 

**CRITICAL**: To achieve human-crafted quality (not AI-generated), create work that looks like it took countless hours. Make it appear as though someone at the absolute top of their field labored over every detail with painstaking care. Ensure the composition, spacing, color choices, typography - everything screams expert-level craftsmanship. Double-check that nothing overlaps, formatting is flawless, every detail perfect. Create something that could be shown to people to prove expertise and rank as undeniably impressive.

Output the final result as a single, downloadable .pdf or .png file, alongside the design philosophy used as a .md file.

## WIREFRAME SPECIFICATIONS

Based on the Modular Consistency philosophy, here are the specifications for the improved components:

### FormField Component
- **Structure**: Vertical stack (label → input → error message)
- **Spacing**: Consistent 2-unit gap between elements (using --spacing-2 = 8px)
- **Label**: Text-sm font-medium text-gray-600
- **Input**: 
  - Full width (w-full)
  - Padding: pl-3 pr-4 py-2 (using --spacing-1_5 = 6px for vertical, --spacing-3 = 12px for horizontal)
  - Border: border-gray-200 (using --color-border)
  - Border radius: rounded-md (using --border-radius-md = 6px)
  - Focus ring: focus:ring-2 focus:ring-primary focus:border-primary
  - Font: text-sm
- **Error message**: mt-1 text-sm text-red-600 (using --spacing-1 = 4px for margin-top)

### SearchInput Component
- **Structure**: Horizontal arrangement (icon → input → clear button)
- **Container**: relative flex items-center
- **Icon**: 
  - Position: absolute left-3
  - Size: material-symbols-outlined
  - Color: text-gray-400
- **Input**:
  - Width: w-full
  - Padding: pl-10 pr-4 py-2 (left padding for icon spacing, right padding for balance, vertical consistent with other inputs)
  - Border: border-gray-200
  - Border radius: rounded-md
  - Focus ring: focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none
  - Font: text-sm
- **Clear button**:
  - Position: absolute right-2
  - Visibility: Conditional (only shows when modelValue exists)
  - Color: text-gray-400 hover:text-gray-600
  - Size: Icon-only button

### AppButton Component
- **Structure**: Single interactive element
- **Variants**:
  - Primary: bg-primary text-white hover:bg-primary-dark
  - Secondary: bg-secondary text-white hover:bg-secondary-dark
  - Success: bg-success text-white hover:bg-success-dark
  - Warning: bg-warning text-white hover:bg-warning-dark
  - Danger: bg-danger text-white hover:bg-danger-dark
  - Outline: border border-gray-300 text-gray-700 hover:bg-gray-50
  - Link: border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]
- **Sizes**:
  - Small: text-xs px-2 py-1
  - Medium: text-sm px-4 py-2
  - Large: text-base px-6 py-3
- **Common**: px-4 py-2 rounded-md font-medium with focus states

### PanelCard Component
- **Structure**: Card with optional header and body
- **Container**: 
  - Background: white
  - Border: border-gray-200
  - Border radius: rounded-lg
  - Shadow: shadow-sm (0 1px 3px rgba(15, 23, 42, 0.04))
  - Padding: p-3 (default), p-2_5 (mobile)
- **Header**:
  - Display: flex
  - Alignment: items-start
  - Justification: space-between
  - Gap: gap-3
  - Margin bottom: mb-2
- **Title Row**:
  - Display: flex
  - Gap: gap-2
  - Alignment: items-center
- **Icon**: text-xl text-primary
- **Title**:
  - Font family: var(--font-family-sans)
  - Font size: text-base
  - Font weight: 600
  - Line height: 1.35
  - Responsive: text-sm (mobile)
- **Subtitle**:
  - Font family: var(--font-family-sans)
  - Font size: text-xs
  - Color: text-gray-500
- **Body**:
  - Margin top: margin-1_5

### TabGroup Component
- **Structure**: Horizontal tabs with active state indicator
- **Container**: 
  - Display: flex
  - Space: space-x-1
  - Border bottom: border-b border-gray-200
- **Tab**:
  - Padding: px-3 py-1.5
  - Typography: text-sm font-medium
  - Hover: hover:bg-gray-50
  - Focus: focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
  - Transition: transition-colors duration-150
- **Active Tab**:
  - Border bottom: border-b-2 border-primary

### FilterBar Component
- **Structure**: Horizontal arrangement (search input → action button)
- **Container**: 
  - Display: flex
  - Items: items-center
  - Wrap: flex-wrap
  - Gap: gap-2
- **Search Container**:
  - Position: relative
  - Width: flex-1
  - Minimum width: min-w-[200px]
- **Search Icon**:
  - Position: absolute
  - Left: left-2
  - Top: top-1/2
  - Transform: -translate-y-1/2
  - Color: text-gray-400
- **Search Input**:
  - Width: w-full
  - Padding: pl-10 pr-4 py-2
  - Border: border border-gray-200
  - Border radius: rounded-md
  - Focus ring: focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none
  - Font: text-sm
- **Action Button**:
  - Padding: px-4 py-2
  - Border: border border-gray-200
  - Border radius: rounded-md
  - Hover: hover:bg-gray-50
  - Focus: focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
  - Transition: transition-colors duration-150
  - Font: text-sm font-medium

### DataTable Component
- **Structure**: Table with title, header, body, and empty state
- **Container**: 
  - Width: w-full
- **Title**:
  - Font family: var(--font-family-sans)
  - Font size: text-base
  - Font weight: 600
  - Margin bottom: mb-2
- **Wrapper**:
  - Overflow: overflow-x-auto
- **Table**:
  - Width: w-full
  - Border collapse: border-collapse
  - Border: border border-gray-200
- **Header Cells**:
  - Font size: text-xs
  - Font weight: 600
  - Text alignment: text-left
  - Padding: px-3 py-2
  - Border bottom: border-b border-gray-200
  - Background: bg-gray-50
- **Body Cells**:
  - Font size: text-sm
  - Padding: px-3 py-2
  - Border bottom: border-b border-gray-200
- **Empty State**:
  - Font family: var(--font-family-sans)
  - Font size: text-xs
  - Color: text-gray-400
  - Alignment: text-center
  - Padding: py-6

### Card Component
- **Structure**: Simple container with configurable padding
- **Container**: 
  - Padding: p-[{padding}] (configurable)
  - Background: bg-white
  - Border: border border-gray-200
  - Border radius: rounded-lg
  - Shadow: shadow-sm

## EXPORTS
This wireframe documents the design specifications for consistent form components in the TrackIT application. The actual implementation can be found in:
- frontend/src/components/ui/FormField.vue
- frontend/src/components/ui/SearchInput.vue

## CTAs
- Primary: bg-[#0A51B0] hover:bg-[#0A4391] (brand-primary)
- Secondary: bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] (outline style)

## MOTION STANCE
- Reduced-motion fallback: ≤150ms opacity crossfade
- Focus rings: 150ms transition for smooth feedback
- Hover states: 150ms transition for responsive feedback

## EXAMPLES
See the implemented components in:
- frontend/src/components/ui/FormField.vue
- frontend/src/components/ui/SearchInput.vue

These components exemplify the Modular Consistency philosophy through:
- Consistent use of Tailwind utility classes
- Application of design system tokens
- Deliberate spacing and typography choices
- Clear visual hierarchy
- Expert-level attention to detail