import React from 'react';

const UsageProgressBar = ({ current, max, label, icon: Icon }) => {
    const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

    let barColor = "bg-blue-500";
    if (percentage > 90) barColor = "bg-red-500";
    else if (percentage > 75) barColor = "bg-yellow-500";

    return (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 flex items-center">
                    {Icon && <Icon className="h-4 w-4 mr-2 text-gray-500" />}
                    {label}
                </span>
                <span className="text-sm font-medium text-gray-700">
                    {current} / {max} ({Math.round(percentage)}%)
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export default UsageProgressBar;
