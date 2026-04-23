import Vue from 'vue';

Vue.directive('click-outside', {
  bind(el, binding, vnode) {
    el.clickOutsideEvent = function (event) {
      // here I check that click was outside the el and his children
      if (!(el === event.target || el.contains(event.target))) {
        // and if it did, call method provided in attribute value
        vnode.context[binding.expression](event);
      }
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unbind(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent);
  },
});

function formatInput(value) {
  const x = value.replace(/\D/g, '')
    .match(/(\d?)(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
  let formatted = '';

  if (x && x[1]) {
    if (x[1] === '8') {
      formatted += '8';
      formatted += x[2] ? ` (9${x[2].slice(1)}` : '';
    } else if (x[1] === '7') {
      formatted += '+7';
      formatted += x[2] ? ` (9${x[2].slice(1)}` : '';
    } else {
      formatted += '+7 (9';
      formatted += x[2] ? `${x[2].slice(1)}` : '';
    }
    formatted += x[3] ? `) ${x[3]}` : '';
    formatted += x[4] ? `-${x[4]}` : '';
    formatted += x[5] ? `-${x[5]}` : '';
  }

  return formatted;
}

function onInputHandler(e) {
  if (!e.isTrusted) return;
  e.target.value = formatInput(e.target.value);
  e.target.dispatchEvent(new Event('input'));
}

Vue.directive('phone-mask', {
  bind: (el, binding) => {
    if (!binding.value) return;
    el.addEventListener('input', onInputHandler);
  },
  unbind: (el) => {
    el.removeEventListener('input', onInputHandler);
  },
});
