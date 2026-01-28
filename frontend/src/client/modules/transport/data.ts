export interface City {
    id: string;
    name: string;
}

export interface Stop {
    id: string;
    name: string;
}

export const CITIES: City[] = [
    { id: 'islamabad', name: 'Islamabad' },
    { id: 'rawalpindi', name: 'Rawalpindi' },
    { id: 'lahore', name: 'Lahore' },
    { id: 'peshawar', name: 'Peshawar' },
];

export const STOPS: Stop[] = [
    // Islamabad stops
    { id: 'isl_f6', name: 'F-6 Markaz' },
    { id: 'isl_f7', name: 'F-7 Markaz' },
    { id: 'isl_f10', name: 'F-10 Markaz' },
    { id: 'isl_blue', name: 'Blue Area' },
    // Rawalpindi stops
    { id: 'rwp_saddar', name: 'Saddar' },
    { id: 'rwp_faizabad', name: 'Faizabad' },
    { id: 'rwp_6th', name: '6th Road' },
    { id: 'rwp_committee', name: 'Committee Chowk' },
    // Lahore stops
    { id: 'lhr_liberty', name: 'Liberty Market' },
    { id: 'lhr_gulberg', name: 'Gulberg' },
    { id: 'lhr_model', name: 'Model Town' },
    // Peshawar stops
    { id: 'psh_hayat', name: 'Hayatabad' },
    { id: 'psh_uni', name: 'University Town' },
    { id: 'psh_saddar', name: 'Saddar' },
];
