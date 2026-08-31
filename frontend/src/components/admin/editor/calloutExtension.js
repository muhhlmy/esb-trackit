import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import CalloutNodeView from './CalloutNodeView.vue';

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout') || 'info',
        renderHTML: (attributes) => ({
          'data-callout': attributes.type
        })
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
        getAttrs: (element) => ({
          type: element.getAttribute('data-callout') || 'info'
        })
      },
      {
        tag: 'blockquote',
        getAttrs: (element) => {
          const text = element.innerText || '';
          if (text.includes('⚠️') || text.toLowerCase().includes('peringatan') || text.toLowerCase().includes("don't")) {
            return { type: 'warning' };
          }
          if (text.toLowerCase().includes('best practice') || text.toLowerCase().includes('do:')) {
            return { type: 'dos' };
          }
          return { type: 'info' };
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes['data-callout'] || 'info';
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `callout-card callout-${type}`,
        'data-callout': type
      }),
      0
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(CalloutNodeView);
  },

  addCommands() {
    return {
      setCallout: (attributes) => ({ commands }) => {
        return commands.wrapIn(this.name, attributes);
      },
      toggleCallout: (attributes) => ({ commands }) => {
        return commands.toggleWrap(this.name, attributes);
      },
      insertCallout: (attributes, contentText) => ({ chain }) => {
        let defaultText = 'Catatan Penting: Tuliskan informasi atau instruksi di sini...';
        if (attributes.type === 'warning') {
          defaultText = 'Peringatan: Tuliskan peringatan kritis atau perhatian operasional di sini...';
        } else if (attributes.type === 'dos') {
          defaultText = 'Best Practices (DOs): Tuliskan hal-hal yang dianjurkan untuk dilakukan...';
        } else if (attributes.type === 'donts') {
          defaultText = 'Larangan (DON\'Ts): Tuliskan hal-hal yang dilarang atau harus dihindari...';
        } else if (attributes.type === 'context') {
          defaultText = 'Background & Skenario: Tuliskan latar belakang atau skenario kendala...';
        }

        return chain()
          .insertContent({
            type: this.name,
            attrs: attributes,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: contentText || defaultText
                  }
                ]
              }
            ]
          })
          .run();
      }
    };
  }
});
