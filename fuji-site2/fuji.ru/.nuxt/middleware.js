const middleware = {}

middleware['auth'] = require('..\\middleware\\auth.js')
middleware['auth'] = middleware['auth'].default || middleware['auth']

middleware['authenticated'] = require('..\\middleware\\authenticated.js')
middleware['authenticated'] = middleware['authenticated'].default || middleware['authenticated']

middleware['cache-headers'] = require('..\\middleware\\cache-headers.js')
middleware['cache-headers'] = middleware['cache-headers'].default || middleware['cache-headers']

middleware['cart-empty'] = require('..\\middleware\\cart-empty.js')
middleware['cart-empty'] = middleware['cart-empty'].default || middleware['cart-empty']

middleware['cities'] = require('..\\middleware\\cities.js')
middleware['cities'] = middleware['cities'].default || middleware['cities']

middleware['onPageChange'] = require('..\\middleware\\onPageChange.js')
middleware['onPageChange'] = middleware['onPageChange'].default || middleware['onPageChange']

middleware['terminal'] = require('..\\middleware\\terminal.js')
middleware['terminal'] = middleware['terminal'].default || middleware['terminal']

export default middleware
