import type { Wallet } from '$lib/types';

export const menuList = [
	{ href: '/market', icon: 'store', text: '마켓', level: 2 },
	{ href: '/exchange', icon: 'currency_exchange', text: '교환', level: 2 },
	{ href: '/office', icon: 'business_center', text: '오피스', level: 2 },
	{ href: '/adm', icon: 'shield_person', text: 'Admin', level: 7 }
];

export const networkFeeList = [
	{ network: 'BEP20', fee: 0 },
	{ network: 'TRC20', fee: 1 },
	{ network: 'ERC20', fee: 5 },
	{ network: 'Polygon', fee: 0.08 }
];

export const initWallets: Wallet[] = [
	{
		address: '',
		network: 'BEP20',
	},
	{
		address: '',
		network: 'TRC20',
	},
	{
		address: '',
		network: 'ERC20',
	},
	{
		address: '',
		network: 'Polygon',
	}
];
