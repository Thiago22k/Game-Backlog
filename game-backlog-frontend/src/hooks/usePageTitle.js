import { useEffect } from 'react';

const usePageTitle = (title) => {
    useEffect(() => {
        document.title = title ? `${title} | Stackd` : 'Stackd';
    }, [title]);
};

export default usePageTitle;
