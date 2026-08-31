import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import SummaryNodeView from './SummaryNodeView.vue';

export const SummaryNode = Node.create({
  name: 'summaryBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-summary-block]'
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'summary-block-card',
        'data-summary-block': ''
      }),
      0
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(SummaryNodeView);
  },

  addCommands() {
    return {
      setSummaryBlock: (contentText) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: contentText || 'Tulis ringkasan singkat FAQ / SOP ini...'
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
