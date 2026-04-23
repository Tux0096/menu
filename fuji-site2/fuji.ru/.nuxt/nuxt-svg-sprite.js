import svgSprite from '~svg-sprite-runtime'

const SPRITES = {
"icons": () => import('..\\assets\\sprite\\gen/icons.svg')
}

export default function(context, inject) {
    inject('svgSprite', svgSprite({
        importSprite: key => SPRITES[key] ? SPRITES[key]() : Promise.resolve(""),
        defaultSprite: 'icons',
        spriteClassPrefix: 'sprite-',
        spriteClass: 'icon',
    }))
}
