import React from 'react';
import { Box, Typography, Button, Stack, SvgIcon } from '@mui/material';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  type?: 'courses' | 'students' | 'assignments' | 'generic';
}

// Default icon for empty courses state
const CoursesIcon = () => (
  <SvgIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.7 }}>
    <path d="M21,5c-1.11-0.35-2.33-0.5-3.5-0.5c-1.95,0-4.05,0.4-5.5,1.5c-1.45-1.1-3.55-1.5-5.5-1.5S2.45,4.9,1,6v14.65 c0,0.25,0.25,0.5,0.5,0.5c0.1,0,0.15-0.05,0.25-0.05C3.1,20.45,5.05,20,6.5,20c1.95,0,4.05,0.4,5.5,1.5c1.35-0.85,3.8-1.5,5.5-1.5 c1.65,0,3.35,0.3,4.75,1.05c0.1,0.05,0.15,0.05,0.25,0.05c0.25,0,0.5-0.25,0.5-0.5V6C22.4,5.55,21.75,5.25,21,5z M21,18.5 c-1.1-0.35-2.3-0.5-3.5-0.5c-1.7,0-4.15,0.65-5.5,1.5V8c1.35-0.85,3.8-1.5,5.5-1.5c1.2,0,2.4,0.15,3.5,0.5V18.5z" />
    <path d="M17.5,10.5c0.88,0,1.73,0.09,2.5,0.26V9.24C19.21,9.09,18.36,9,17.5,9c-1.7,0-3.24,0.29-4.5,0.83v1.66 C14.13,10.85,15.7,10.5,17.5,10.5z" />
    <path d="M13,12.49v1.66c1.13-0.64,2.7-0.99,4.5-0.99c0.88,0,1.73,0.09,2.5,0.26V11.9c-0.79-0.15-1.64-0.24-2.5-0.24 C15.8,11.66,14.26,11.96,13,12.49z" />
    <path d="M17.5,14.33c-1.7,0-3.24,0.29-4.5,0.83v1.66c1.13-0.64,2.7-0.99,4.5-0.99c0.88,0,1.73,0.09,2.5,0.26v-1.52 C19.21,14.41,18.36,14.33,17.5,14.33z" />
  </SvgIcon>
);

// Default icon for empty students state
const StudentsIcon = () => (
  <SvgIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.7 }}>
    <path d="M16,11c1.66,0,2.99-1.34,2.99-3S17.66,5,16,5s-3,1.34-3,3S14.34,11,16,11z M8,11c1.66,0,2.99-1.34,2.99-3S9.66,5,8,5S5,6.34,5,8S6.34,11,8,11z M8,13c-2.33,0-7,1.17-7,3.5V19h14v-2.5C15,14.17,10.33,13,8,13z M16,13c-0.29,0-0.62,0.02-0.97,0.05c1.16,0.84,1.97,1.97,1.97,3.45V19h6v-2.5C23,14.17,18.33,13,16,13z" />
  </SvgIcon>
);

// Default icon for empty assignments state
const AssignmentsIcon = () => (
  <SvgIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.7 }}>
    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
  </SvgIcon>
);

// Generic empty state icon
const GenericIcon = () => (
  <SvgIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.7 }}>
    <path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
  </SvgIcon>
);

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No items found',
  description = 'There are currently no items to display.',
  actionLabel,
  onAction,
  icon,
  type = 'generic'
}) => {
  // Select the appropriate icon based on type
  const getIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'courses':
        return <CoursesIcon />;
      case 'students':
        return <StudentsIcon />;
      case 'assignments':
        return <AssignmentsIcon />;
      default:
        return <GenericIcon />;
    }
  };

  // Get the appropriate title if not specified
  const getTitle = () => {
    if (title !== 'No items found') return title;
    
    switch (type) {
      case 'courses':
        return 'No courses found';
      case 'students':
        return 'No students enrolled';
      case 'assignments':
        return 'No assignments yet';
      default:
        return 'No items found';
    }
  };

  // Get the appropriate description if not specified
  const getDescription = () => {
    if (description !== 'There are currently no items to display.') return description;
    
    switch (type) {
      case 'courses':
        return 'There are currently no courses available. Check back later or contact your administrator.';
      case 'students':
        return 'No students are currently enrolled in this course.';
      case 'assignments':
        return 'There are no assignments in this course yet.';
      default:
        return 'There are currently no items to display.';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 2,
        minHeight: '300px',
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      {getIcon()}
      
      <Typography variant="h5" color="text.primary" gutterBottom mt={3}>
        {getTitle()}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 4 }}>
        {getDescription()}
      </Typography>
      
      {actionLabel && onAction && (
        <Button 
          variant="contained" 
          color="primary" 
          onClick={onAction}
          size="large"
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;