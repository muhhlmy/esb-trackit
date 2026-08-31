import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import ImageNodeView from './ImageNodeView.vue';

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: 'center',
        parseHTML: (element) => {
          return element.getAttribute('data-align') || element.style.textAlign || 'center';
        },
        renderHTML: (attributes) => {
          const align = attributes.alignment || 'center';
          let marginStyle = 'margin: 1.25rem auto;';
          if (align === 'left') {
            marginStyle = 'margin: 1.25rem auto 1.25rem 0;';
          } else if (align === 'right') {
            marginStyle = 'margin: 1.25rem 0 1.25rem auto;';
          }
          return {
            'data-align': align,
            style: `display: block; ${marginStyle} text-align: ${align};`
          };
        }
      }
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageNodeView);
  }
});
