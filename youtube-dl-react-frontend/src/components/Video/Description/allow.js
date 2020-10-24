import { allowAny, exact } from './filters';

export const allow = [
    {
        tag: 'a',
        allowAttributes: [
            ['href', allowAny],
            ['target', exact('_blank')]
        ]
    },
    {
        tag: 'br'
    },
    {
        tag: 'hr'
    }
];
