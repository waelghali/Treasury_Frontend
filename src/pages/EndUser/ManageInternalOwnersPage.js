// frontend/src/pages/EndUser/ManageInternalOwnersPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../services/apiService';
import { Loader2, AlertCircle, PlusCircle, Edit, Users, Eye, Trash2, ChevronUp, ChevronDown, Tag, Star, Globe, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';

import InternalOwnerFormModal from '../../components/Modals/InternalOwnerFormModal';
import BulkChangeLGOwnerModal from '../../components/Modals/BulkChangeLGOwnerModal';
import ChangeLGCategoryModal from '../../components/Modals/ChangeLGCategoryModal';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-slate-900 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm transition-all duration-200";

function ManageInternalOwnersPage({ isGracePeriod }) { // NEW: Accept isGracePeriod prop
    const navigate = useNavigate();
    const location = useLocation();
    const [activeSection, setActiveSection] = useState(() =>
        new URLSearchParams(location.search).get('tab') === 'categories' ? 'categories' : 'owners'
    );

    const [owners, setOwners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState(null);

    const [showBulkChangeLGOwnerModal, setShowBulkChangeLGOwnerModal] = useState(false);
    const [selectedOwnerForBulkChange, setSelectedOwnerForBulkChange] = useState(null);

    // Categories state
    const [categories, setCategories] = useState([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [categoryError, setCategoryError] = useState('');
    const [categorySearchTerm, setCategorySearchTerm] = useState('');
    const [catSortColumn, setCatSortColumn] = useState('name');
    const [catSortDirection, setCatSortDirection] = useState('asc');
    const [categoryModalConfig, setCategoryModalConfig] = useState({
        isOpen: false,
        preselectedSourceCategoryId: '',
        preselectSourceRecords: false,
    });

    // NEW: State for sorting and filtering
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('email');
    const [sortDirection, setSortDirection] = useState('asc');

    const fetchInternalOwners = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await apiRequest('/end-user/internal-owner-contacts/with-lg-count', 'GET');
            setOwners(response);
        } catch (err) {
            console.error("Failed to fetch internal owner contacts:", err);
            setError(`Failed to load internal owner contacts. ${err.message || 'An unexpected error occurred.'}`);
            toast.error(`Failed to load internal owner contacts: ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCategories = async () => {
        setIsLoadingCategories(true);
        setCategoryError('');
        try {
            const response = await apiRequest('/end-user/lg-categories/', 'GET');
            setCategories(Array.isArray(response) ? response : []);
        } catch (err) {
            console.error("Failed to fetch LG categories:", err);
            setCategoryError(`Failed to load LG categories. ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsLoadingCategories(false);
        }
    };

    useEffect(() => {
        fetchInternalOwners();
        fetchCategories();
    }, []);

    const handleCreateNew = () => {
        if (isGracePeriod) { // NEW: Grace period check
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        setSelectedOwner(null);
        setShowFormModal(true);
    };

    const handleEdit = (owner) => {
        if (isGracePeriod) { // NEW: Grace period check
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        setSelectedOwner(owner);
        setShowFormModal(true);
    };

    const handleBulkChangeOwner = (owner) => {
        if (isGracePeriod) { // NEW: Grace period check
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        const totalOwnedLgs = Number(owner?.owned_lgs_total_count ?? owner?.owned_lgs_count ?? 0);
        if (totalOwnedLgs <= 0) {
            toast.warn(`Cannot reassign LGs: '${owner?.email || 'this owner'}' currently has 0 LG records in their ownership.`);
            return;
        }
        setSelectedOwnerForBulkChange(owner);
        setShowBulkChangeLGOwnerModal(true);
    };
    
    const handleViewOwnedLGs = (ownerId) => {
        navigate(`/end-user/lg-records?ownerId=${ownerId}`);
    };

    const handleDelete = async (ownerId) => {
        if (isGracePeriod) { // NEW: Grace period check
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this internal owner contact? This action is irreversible.")) {
            return;
        }
        try {
            await apiRequest(`/end-user/internal-owner-contacts/${ownerId}`, 'DELETE');
            toast.success("Internal owner contact deleted successfully!");
            fetchInternalOwners();
        } catch (err) {
            console.error("Failed to delete internal owner contact:", err);
            toast.error(`Failed to delete contact: ${err.message || 'An unexpected error occurred.'}`);
        }
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedOwner(null);
        setShowBulkChangeLGOwnerModal(false);
        setSelectedOwnerForBulkChange(null);
        fetchInternalOwners();
    };

    // NEW: Sorting and Filtering Logic
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const renderSortIcon = (column) => {
        if (sortColumn === column) {
            return sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />;
        }
        return null;
    };

    const filteredAndSortedOwners = useMemo(() => {
        if (!owners || owners.length === 0) return [];
    
        let sortableOwners = [...owners];
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
    
        // 1. Filter by search term
        const filteredOwners = sortableOwners.filter(owner => 
            owner.email.toLowerCase().includes(lowerCaseSearchTerm) ||
            (owner.phone_number || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (owner.internal_id || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (owner.manager_email || '').toLowerCase().includes(lowerCaseSearchTerm)
        );
    
        // 2. Sort the filtered results
        filteredOwners.sort((a, b) => {
            const aValue = a[sortColumn] || '';
            const bValue = b[sortColumn] || '';
    
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirection === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            }
            return 0;
        });
    
        return filteredOwners;
    }, [owners, searchTerm, sortColumn, sortDirection]);

    const handleOpenCategoryMigration = (category = null) => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        if (category) {
            if (Number(category.lg_count || 0) <= 0) {
                toast.warn(`Category '${category.name}' currently has 0 LG records to migrate.`);
                return;
            }
            setCategoryModalConfig({
                isOpen: true,
                preselectedSourceCategoryId: String(category.id),
                preselectSourceRecords: true,
            });
            return;
        }
        setCategoryModalConfig({
            isOpen: true,
            preselectedSourceCategoryId: '',
            preselectSourceRecords: false,
        });
    };

    const handleViewCategoryLGs = (categoryName) => {
        navigate(`/end-user/lg-records?category=${encodeURIComponent(categoryName)}`);
    };

    const handleCatSort = (column) => {
        if (catSortColumn === column) {
            setCatSortDirection(catSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setCatSortColumn(column);
            setCatSortDirection('asc');
        }
    };

    const renderCatSortIcon = (column) => {
        if (catSortColumn === column) {
            return catSortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />;
        }
        return null;
    };

    const filteredAndSortedCategories = useMemo(() => {
        if (!categories || categories.length === 0) return [];
        const term = categorySearchTerm.trim().toLowerCase();
        const filtered = categories.filter((cat) => {
            if (!term) return true;
            return (
                (cat.name || '').toLowerCase().includes(term) ||
                (cat.code || '').toLowerCase().includes(term) ||
                (cat.extra_field_name || '').toLowerCase().includes(term)
            );
        });
        return [...filtered].sort((a, b) => {
            if (catSortColumn === 'lg_count') {
                const aNum = Number(a.lg_count || 0);
                const bNum = Number(b.lg_count || 0);
                return catSortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }
            const aVal = String(a[catSortColumn] || '');
            const bVal = String(b[catSortColumn] || '');
            return catSortDirection === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        });
    }, [categories, categorySearchTerm, catSortColumn, catSortDirection]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Manage Internal Data</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Manage internal owner contacts, LG categories, and bulk reassignments.</p>
                </div>
                <div className="flex space-x-3">
                    {activeSection === 'owners' ? (
                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                            <button
                                onClick={handleCreateNew}
                                className={`${buttonBaseClassNames} bg-blue-600 text-white hover:bg-blue-700 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isGracePeriod}
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add New Owner
                            </button>
                        </GracePeriodTooltip>
                    ) : (
                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                            <button
                                onClick={() => handleOpenCategoryMigration(null)}
                                className={`${buttonBaseClassNames} bg-indigo-600 text-white hover:bg-indigo-700 ${isGracePeriod || categories.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isGracePeriod || categories.length === 0}
                            >
                                <Tag className="h-4 w-4 mr-2" />
                                Change / Migrate Category
                            </button>
                        </GracePeriodTooltip>
                    )}
                </div>
            </div>

            <div className="mb-4 inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1">
                <button
                    type="button"
                    onClick={() => setActiveSection('owners')}
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        activeSection === 'owners'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Users className="h-4 w-4" />
                    <span>Internal Owners ({owners.length})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSection('categories')}
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        activeSection === 'categories'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Tag className="h-4 w-4" />
                    <span>LG Categories ({categories.length})</span>
                </button>
            </div>

            {activeSection === 'owners' ? (
                <>
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl relative mb-4 flex items-center text-sm" role="alert">
                            <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center py-8">
                            <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
                            <p className="text-slate-500 text-sm mt-2">Loading internal owners...</p>
                        </div>
                    ) : owners.length === 0 ? (
                        <div className="bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
                            <p className="text-slate-500 text-sm">No internal owner contacts found for your customer.</p>
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    onClick={handleCreateNew}
                                    className={`${buttonBaseClassNames} bg-blue-600 text-white hover:bg-blue-700 mt-4 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isGracePeriod}
                                >
                                    Add First Owner
                                </button>
                            </GracePeriodTooltip>
                        </div>
                    ) : (
                        <>
                <div className="relative mb-3">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by email, phone, or ID..."
                        className="block w-full border border-slate-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/90">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none"
                                    onClick={() => handleSort('email')}
                                >
                                    <div className="flex items-center">
                                        Email {renderSortIcon('email')}
                                    </div>
                                </th>
                                <th
                                    scope="col"
                                    className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none"
                                    onClick={() => handleSort('phone_number')}
                                >
                                    <div className="flex items-center">
                                        Phone Number {renderSortIcon('phone_number')}
                                    </div>
                                </th>
                                <th
                                    scope="col"
                                    className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none"
                                    onClick={() => handleSort('internal_id')}
                                >
                                    <div className="flex items-center">
                                        Internal ID {renderSortIcon('internal_id')}
                                    </div>
                                </th>
                                <th
                                    scope="col"
                                    className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none"
                                    onClick={() => handleSort('manager_email')}
                                >
                                    <div className="flex items-center">
                                        Manager Email {renderSortIcon('manager_email')}
                                    </div>
                                </th>
                                <th scope="col" className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">View LGs</th>
                                <th scope="col" className="px-3.5 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filteredAndSortedOwners.map((owner) => (
                                <tr
                                    key={owner.id}
                                    onClick={() => handleEdit(owner)}
                                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                                >
                                    {/* UPDATED: Email Column with mailto: link */}
                                    <td className="px-3.5 py-2.5 max-w-[200px] truncate text-xs sm:text-sm font-medium" title={owner.email}>
                                        <a 
                                            href={`mailto:${owner.email}`} 
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                            title={`Send email to ${owner.email}`}
                                        >
                                            {owner.email}
                                        </a>
                                    </td>
                                    {/* UPDATED: Phone Column with tel: link */}
                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-xs sm:text-sm text-slate-600">
                                        {owner.phone_number ? (
                                            <a 
                                                href={`tel:${owner.phone_number}`} 
                                                onClick={(e) => e.stopPropagation()}
                                                className="hover:text-blue-600 hover:underline"
                                                title={`Call ${owner.phone_number}`}
                                            >
                                                {owner.phone_number}
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-xs sm:text-sm text-slate-600">{owner.internal_id || 'N/A'}</td>
                                    <td className="px-3.5 py-2.5 max-w-[200px] truncate text-xs sm:text-sm text-slate-600" title={owner.manager_email || 'N/A'}>{owner.manager_email || 'N/A'}</td>
                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center text-xs sm:text-sm text-slate-600" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleViewOwnedLGs(owner.id)}
                                            className={`inline-flex items-center space-x-1 font-semibold tabular-nums
                                                        ${owner.owned_lgs_total_count > 0 ? 'text-blue-600 hover:text-blue-800' : 'text-slate-400 cursor-not-allowed'}`}
                                            title={owner.owned_lgs_total_count > 0 ? "Click to view all LGs for this owner" : "No LGs to display"}
                                            disabled={owner.owned_lgs_total_count === 0}
                                        >
                                            <span>
                                                {owner.owned_lgs_count || 0}
                                                {owner.owned_lgs_total_count > owner.owned_lgs_count ? ` (${owner.owned_lgs_total_count})` : ''}
                                            </span>
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </td>
                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                            <button
                                                onClick={() => handleEdit(owner)}
                                                className={`text-indigo-600 hover:text-indigo-900 mr-1.5 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title="Edit Owner Details"
                                                disabled={isGracePeriod} // NEW: Disable button
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        </GracePeriodTooltip>
                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                            <button
                                                onClick={() => handleBulkChangeOwner(owner)}
                                                className={`text-purple-600 hover:text-purple-900 mr-1.5 p-1.5 rounded-lg hover:bg-purple-50 transition-colors ${isGracePeriod || Number(owner.owned_lgs_total_count || 0) <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                title={Number(owner.owned_lgs_total_count || 0) <= 0 ? 'Cannot reassign — this owner currently has 0 LG records' : 'Reassign all LGs for this owner'}
                                                disabled={isGracePeriod || Number(owner.owned_lgs_total_count || 0) <= 0}
                                            >
                                                <Users className="h-4 w-4" />
                                            </button>
                                        </GracePeriodTooltip>
                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                            <button
                                                onClick={() => handleDelete(owner.id)}
                                                className={`text-rose-600 hover:text-rose-900 p-1.5 rounded-lg hover:bg-rose-50 transition-colors ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title="Delete Owner"
                                                disabled={isGracePeriod} // NEW: Disable button
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </GracePeriodTooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAndSortedOwners.length === 0 && (
                        <div className="bg-slate-50 p-6 text-center border-t border-slate-200">
                            <p className="text-slate-500 text-sm">No owners match your search criteria.</p>
                        </div>
                    )}
                </div>
                </>
                    )}
                </>
            ) : (
                <>
                    <div className="mb-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs sm:text-sm text-indigo-900">
                        Category definitions and default category settings are managed by your Corporate Administrator. Use <strong>Migrate LGs</strong> to reclassify single, selected, or all LGs across categories.
                    </div>

                    {categoryError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl relative mb-4 flex items-center text-sm" role="alert">
                            <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                            <span className="block sm:inline">{categoryError}</span>
                        </div>
                    )}

                    {isLoadingCategories ? (
                        <div className="text-center py-8">
                            <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto" />
                            <p className="text-slate-500 text-sm mt-2">Loading LG categories...</p>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
                            <p className="text-slate-500 text-sm">No LG categories available for your account.</p>
                        </div>
                    ) : (
                        <>
                            <div className="relative mb-3">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search by category name, code, or custom field..."
                                    className="block w-full border border-slate-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    value={categorySearchTerm}
                                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/90">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none"
                                                onClick={() => handleCatSort('name')}
                                            >
                                                <div className="flex items-center">
                                                    Category Name {renderCatSortIcon('name')}
                                                </div>
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none"
                                                onClick={() => handleCatSort('code')}
                                            >
                                                <div className="flex items-center">
                                                    Code {renderCatSortIcon('code')}
                                                </div>
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none"
                                                onClick={() => handleCatSort('extra_field_name')}
                                            >
                                                <div className="flex items-center">
                                                    Custom Extra Field {renderCatSortIcon('extra_field_name')}
                                                </div>
                                            </th>
                                            <th scope="col" className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                Entity Scope
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none"
                                                onClick={() => handleCatSort('lg_count')}
                                            >
                                                <div className="flex items-center justify-center">
                                                    View LGs {renderCatSortIcon('lg_count')}
                                                </div>
                                            </th>
                                            <th scope="col" className="px-3.5 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {filteredAndSortedCategories.map((cat) => {
                                            const lgCount = Number(cat.lg_count || 0);
                                            const entityScopeText =
                                                cat.customer_id === null || cat.has_all_entity_access
                                                    ? 'All Entities'
                                                    : (cat.entities_with_access || []).map((e) => e.entity_name).join(', ') || 'Restricted';
                                            return (
                                                <tr key={`cat-${cat.id}`} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span>{cat.name}</span>
                                                            {cat.is_default && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    <Star className="h-3 w-3 mr-1 fill-emerald-600 text-emerald-600" />
                                                                    Default
                                                                </span>
                                                            )}
                                                            {cat.customer_id === null && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                                    <Globe className="h-3 w-3 mr-1" />
                                                                    Universal
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-xs sm:text-sm text-slate-600 font-mono">
                                                        {cat.code || '—'}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-xs sm:text-sm text-slate-600">
                                                        {cat.extra_field_name ? (
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <span className="font-medium text-slate-800">{cat.extra_field_name}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                                    cat.is_mandatory
                                                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                }`}>
                                                                    {cat.is_mandatory ? 'Mandatory' : 'Optional'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">None</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-xs sm:text-sm text-slate-600 max-w-[180px] truncate" title={entityScopeText}>
                                                        {entityScopeText}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center text-xs sm:text-sm text-slate-500">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewCategoryLGs(cat.name)}
                                                            className={`inline-flex items-center space-x-1 font-semibold tabular-nums ${
                                                                lgCount > 0 ? 'text-blue-600 hover:text-blue-800' : 'text-slate-400 cursor-not-allowed'
                                                            }`}
                                                            title={lgCount > 0 ? `Click to view all LGs in ${cat.name}` : 'No LGs to display'}
                                                            disabled={lgCount === 0}
                                                        >
                                                            <span>{lgCount}</span>
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenCategoryMigration(cat)}
                                                                disabled={isGracePeriod || lgCount <= 0}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 ${
                                                                    isGracePeriod || lgCount <= 0 ? 'opacity-40 cursor-not-allowed' : ''
                                                                }`}
                                                                title={lgCount <= 0 ? 'No LGs assigned to migrate' : `Migrate LGs from ${cat.name}`}
                                                            >
                                                                <Tag className="h-3.5 w-3.5" />
                                                                Migrate LGs
                                                            </button>
                                                        </GracePeriodTooltip>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {filteredAndSortedCategories.length === 0 && (
                                    <div className="bg-slate-50 p-6 text-center border-t border-slate-200">
                                        <p className="text-slate-500 text-sm">No categories match your search criteria.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {showFormModal && (
                <InternalOwnerFormModal
                    owner={selectedOwner}
                    onClose={() => setShowFormModal(false)}
                    onSuccess={handleFormSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}

            {showBulkChangeLGOwnerModal && selectedOwnerForBulkChange && (
                <BulkChangeLGOwnerModal
                    owner={selectedOwnerForBulkChange}
                    onClose={() => setShowBulkChangeLGOwnerModal(false)}
                    onSuccess={handleFormSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}

            {categoryModalConfig.isOpen && (
                <ChangeLGCategoryModal
                    initialScope="multiple"
                    categories={categories}
                    preselectedSourceCategoryId={categoryModalConfig.preselectedSourceCategoryId}
                    preselectSourceRecords={categoryModalConfig.preselectSourceRecords}
                    onClose={() =>
                        setCategoryModalConfig({
                            isOpen: false,
                            preselectedSourceCategoryId: '',
                            preselectSourceRecords: false,
                        })
                    }
                    onSuccess={() => {
                        setCategoryModalConfig({
                            isOpen: false,
                            preselectedSourceCategoryId: '',
                            preselectSourceRecords: false,
                        });
                        fetchCategories();
                    }}
                    isGracePeriod={isGracePeriod}
                />
            )}
        </div>
    );
}

export default ManageInternalOwnersPage;