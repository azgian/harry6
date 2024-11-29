import { toast } from '$lib/components/toast';
import type { Timestamp } from 'firebase/firestore';

export const swipe = (node: HTMLElement, { threshold = 50, timeout = 300 }) =>
{
    let startX: number;
    let startY: number;
    let startTime: number;
    let isSwiping: boolean = false;

    function handleTouchStart(event: TouchEvent) {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        isSwiping = true;
    }

    function handleTouchMove(event: TouchEvent) {
        if (!isSwiping) return;
        event.preventDefault();
    }

    function handleTouchEnd(event: TouchEvent) {
        if (!isSwiping) return;
        isSwiping = false;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        const deltaTime = Date.now() - startTime;

        if (deltaTime > timeout) return;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
            const direction = deltaX > 0 ? 'right' : 'left';
            node.dispatchEvent(new CustomEvent('swipe', {
                detail: { direction }
            }));
        }
    }

    node.addEventListener('touchstart', handleTouchStart);
    node.addEventListener('touchmove', handleTouchMove);
    node.addEventListener('touchend', handleTouchEnd);

    return {
        destroy() {
            node.removeEventListener('touchstart', handleTouchStart);
            node.removeEventListener('touchmove', handleTouchMove);
            node.removeEventListener('touchend', handleTouchEnd);
        }
    };
}

export const handleToggleState = (state: boolean) => (state = !state);

import type { InputValues } from '$lib/types';

export const alertEmptyValue = (values: InputValues[]): boolean => {
	for (let i = 0; i < values.length; i++) {
		if (!values[i].value) {
			toast.show(`${values[i].name}을 채워주세요.`, 'error', 1500);
			return false;
		}
	}
	return true;
};

export const setCommaInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    // 현재 커서 위치 저장
    const cursorPosition = input.selectionStart ?? 0;
    // 이전 값의 콤마 개수
    const prevCommaCount = (input.value.match(/,/g) || []).length;
    // 숫자만 추출
    const value = input.value.replace(/[^\d]/g, '');
    // 숫자를 정수로 변환
    const newAmount = parseInt(value) || 0;
    // 세자리마다 콤마 추가
    const formattedValue = newAmount.toLocaleString('ko-KR');
    input.value = formattedValue;
    // 다음 프레임에서 커서 위치 조정
    setTimeout(() => {
        // 새로운 값의 콤마 개수
        const newCommaCount = (formattedValue.match(/,/g) || []).length;
        // 콤마 차이를 고려한 새로운 커서 위치
        const newPosition = cursorPosition + (newCommaCount - prevCommaCount);
        input.setSelectionRange(newPosition, newPosition);
    }, 0);
    return newAmount;
};

export const formatDate = (date: Date | Timestamp | string | null | undefined, includeTime: boolean = false) => {
    if (!date) return '';

    let dateObj: Date;

    if (date instanceof Date) {
        dateObj = date;
    } else if (typeof date === 'string') {
        dateObj = new Date(date);
    } else if ('toDate' in date) {  // Timestamp 타입 체크
        dateObj = date.toDate();
    } else {
        return '';
    }

    const year = dateObj.getFullYear().toString().slice(-2);
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    let hm = '';

    if (includeTime) {
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        hm = `${hours}:${minutes}`;
    }

    return `${year}-${month}-${day} ${hm}`;
};

export const scrollToElement = (elementId: string) => {
	const element = document.querySelector(elementId);
	if (element) {
		element.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
};

export const getDeviceType = () => {
    // SSR 체크
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent;
    // 태블릿 체크
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    // 모바일 체크
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    // 나머지는 데스크톱으로 간주
    return 'desktop';
}

export const removeLeadingZero = (e: Event) => {
	const input = e.currentTarget as HTMLInputElement;
	input.value = Number(input.value).toString();
};
