import React, { useState, useEffect, useCallback, useMemo } from 'react';
import moment from 'moment';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../services/apiService';
import {
    getEventIcon,
    formatActionTypeLabel,
    getExpiryBarProps
} from '../utils/timelineHelpers'; 

const LgTimelineBar = ({ lgRecord }) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTooltip, setActiveTooltip] = useState(null);

    const LG_CREATED_TYPE = 'LG_CREATED';

    const formatEventForTimeline = (eventItem) => {
        const isCompleted = eventItem.action_type === 'LG_CREATED' || 
                            eventItem.action_type.includes('RELEASED') || 
                            eventItem.action_type.includes('LIQUIDATED') ||
                            eventItem.action_type.includes('ACTIVATED') ||
                            eventItem.action_type.includes('AMENDED') ||
                            eventItem.action_type.includes('EXTENDED') ||
                            eventItem.action_type.includes('DECREASED');
        const isPending = eventItem.action_type.includes('REQUEST_SUBMITTED');
        const isOverdue = eventItem.action_type.includes('REMINDER_SENT');

        let color = 'gray';
        let borderColor = 'border-gray-500';

        if (isCompleted) {
            color = 'green';
            borderColor = 'border-green-500';
        } else if (isPending) {
            color = 'yellow';
            borderColor = 'border-yellow-500';
        } else if (isOverdue) {
            color = 'red';
            borderColor = 'border-red-500';
        }

        return {
            ...eventItem,
            color,
            borderColor
        };
    };

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const history = await apiRequest(`/end-user/lg-records/${lgRecord.id}/lifecycle-history`, 'GET');
            
            // Filter and process events to show only key milestones
            const timelineEvents = history.filter(event => 
                ['LG_CREATED', 'LG_EXTENDED', 'LG_AMENDED', 'LG_DECREASED_AMOUNT', 'LG_RELEASED', 'LG_LIQUIDATED_FULL', 'LG_LIQUIDATED_PARTIAL', 'LG_REMINDER_SENT_TO_BANK', 'LG_ACTIVATE_NON_OPERATIVE'].includes(event.action_type)
            ).sort((a, b) => moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf());
            
            setEvents(timelineEvents.map(formatEventForTimeline));
            
        } catch (err) {
            console.error("Failed to fetch LG lifecycle history for timeline:", err);
            setError("Failed to load timeline events.");
        } finally {
            setIsLoading(false);
        }
    }, [lgRecord.id]);

    useEffect(() => {
        if (lgRecord?.id) {
            fetchEvents();
        }
    }, [lgRecord, fetchEvents]);

    const { barColorClass, fillColorClass, labelText, percentage, indicatorColor, glowShadow } = useMemo(() => getExpiryBarProps(lgRecord), [lgRecord]);

    const lgCreationDate = useMemo(() => {
        const creationEvent = events.find(event => event.action_type === LG_CREATED_TYPE);
        return creationEvent ? moment(creationEvent.timestamp) : moment(lgRecord.issuance_date);
    }, [events, lgRecord.issuance_date]);

    const totalDays = moment(lgRecord.expiry_date).diff(lgCreationDate, 'days');

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <p className="ml-2 text-gray-600">Loading LG timeline...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-center">
                <AlertCircle className="mr-2" size={20} />
                {error}
            </div>
        );
    }

    return (
        <div className="relative mb-8">
            <div className={`w-full h-6 rounded-full ${barColorClass} relative overflow-hidden shadow-inner flex items-center`}>
                <div
                    className={`h-full rounded-full ${fillColorClass} transition-all duration-500 ease-in-out`}
                    style={{ width: `${percentage}%`, boxShadow: glowShadow }}
                ></div>
                <div className="absolute inset-0 flex items-center px-4 justify-between">
                    <span className={`font-semibold text-sm md:text-base ${indicatorColor} text-shadow-sm`}>
                        {formatActionTypeLabel('LG_CREATED')}
                    </span>
                    <span className={`font-semibold text-sm md:text-base ${indicatorColor} text-shadow-sm`}>
                        {labelText}
                    </span>
                </div>
            </div>

            <div className="relative w-full h-2 bg-gray-300 rounded-full my-4">
                {events.map((event, index) => {
                    const eventDate = moment(event.timestamp);
                    const positionPercentage = totalDays > 0 ? (eventDate.diff(lgCreationDate, 'days') / totalDays) * 100 : 0;
                    
                    if (positionPercentage < 0 || positionPercentage > 100) return null;

                    const instruction = lgRecord.instructions.find(instr => instr.id === event.entity_id);

                    return (
                        <div
                            key={index}
                            className="absolute -top-1.5 -translate-x-1/2 cursor-pointer group"
                            style={{ left: `${positionPercentage}%` }}
                            onMouseEnter={() => setActiveTooltip(event.id)}
                            onMouseLeave={() => setActiveTooltip(null)}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 ${event.borderColor} bg-white shadow-md flex items-center justify-center transition-transform duration-200 group-hover:scale-125`}>
                                {getEventIcon(event.action_type, '12')}
                            </div>
                            {activeTooltip === event.id && (
                                <div className="absolute left-1/2 transform -translate-x-1/2 mt-3 p-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg w-max z-20">
                                    <p className="font-bold">{formatActionTypeLabel(event.action_type)}</p>
                                    <p>{moment(event.timestamp).format('MMM Do, YYYY')}</p>
                                    {instruction?.instruction_type && <p>Instruction: {formatActionTypeLabel(instruction.instruction_type)}</p>}
                                    {instruction?.delivery_date && <p>Delivered: {moment(instruction.delivery_date).format('MMM Do, YYYY')}</p>}
                                    {instruction?.bank_reply_date && <p>Replied: {moment(instruction.bank_reply_date).format('MMM Do, YYYY')}</p>}
                                    {event.action_type.includes('REMINDER') && <p>Reminder Sent</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between items-center text-sm font-medium text-gray-600 px-1">
                <span>{moment(lgCreationDate).format('MMM Do, YYYY')}</span>
                <span>{moment(lgRecord.expiry_date).format('MMM Do, YYYY')}</span>
            </div>
        </div>
    );
};

export default LgTimelineBar;