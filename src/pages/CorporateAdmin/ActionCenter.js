import React from 'react';
import EndUserActionCenter from '../EndUser/EndUserActionCenter';

const ActionCenter = ({ isGracePeriod }) => {
    return <EndUserActionCenter isCorporateAdminView={true} isGracePeriod={isGracePeriod} />;
};

export default ActionCenter;