/** @type {import('tailwindcss').Config} */
export default {
	important: '#tailwind_qaing',
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {},
	},
	plugins: [],
	corePlugins: {
		preflight: false,
	},
	theme: {
		extend: {
			fontFamily: {
				pretendard: ['Pretendard', 'sans-serif'],
			},
			colors: {
				sementic: {
					danger: '#F63B28',
					check: '#0D7EFF',
					disabled: '#C2C2C2',
				},
				primary: {
					default: '#00CCCC',
					hover: '#6DDBD9',
					pressed: '#00C1C4',
					ligth: '#EDFBFB',
				},
				gray: {
					900: '#3B3C3C',
					800: '#5F6060',
					700: '#808181',
					600: '#959797',
					500: '#C0C2C2',
					400: '#DCDEDE',
					300: '#EEF0F0',
					200: '#F3F5F5',
					100: '#F7FAFA',
					50: '#F9FCFC',
				},
				extra: {
					black: '#1B1B1B',
					white: '#FFFFFF',
					record: '#FF5847',
				},
			},
			boxShadow: {
				modal: '0px 6px 22px 0px rgba(0, 0, 0, 0.20);',
				dropdown: '0px 6px 14px 0px rgba(0, 0, 0, 0.20)',
				copybutton: ' 0px 4px 8px 0px rgba(0, 0, 0, 0.16)',
			},
		},
	},
}
