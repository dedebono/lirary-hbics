import React, { useState, useEffect } from 'react';

const DigitalClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formattedTime = time.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const formattedDate = time.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Makassar',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="fixed bottom-6 right-6 bg-white/90 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-gray-200 z-50 transition-all hover:scale-105 hover:shadow-xl">
            <div className="text-3xl font-bold text-primary-600 tabular-nums tracking-wider text-center">
                {formattedTime}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-widest text-center mt-1">
                {formattedDate}
            </div>
            <div className="text-[10px] text-gray-400 text-center mt-1">
                Balikpapan (UTC+8)
            </div>
        </div>
    );
};

export default DigitalClock;
