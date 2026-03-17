/**
 * ISTHO CRM - Configuración del Tema
 * Basado en diseño del WMS Copérnico para consistencia visual
 * 
 * @author Coordinación TI
 * @date Enero 2026
 */

import { createTheme } from '@mui/material/styles';

// ============================================
// PALETA DE COLORES CORPORATIVOS ISTHO
// ============================================
const isthoColors = {
  // Colores primarios - Naranja corporativo
  primary: {
    main: '#E65100',       // Naranja ISTHO principal
    light: '#FF833A',      // Naranja claro
    dark: '#AC1900',       // Naranja oscuro
    contrastText: '#FFFFFF'
  },
  
  // Colores secundarios - Gris azulado (estilo WMS)
  secondary: {
    main: '#455A64',       // Gris azulado principal
    light: '#718792',
    dark: '#1C313A',
    contrastText: '#FFFFFF'
  },
  
  // Colores de estado
  success: {
    main: '#2E7D32',       // Verde éxito
    light: '#4CAF50',
    dark: '#1B5E20'
  },
  warning: {
    main: '#ED6C02',       // Naranja advertencia
    light: '#FF9800',
    dark: '#E65100'
  },
  error: {
    main: '#D32F2F',       // Rojo error
    light: '#EF5350',
    dark: '#C62828'
  },
  info: {
    main: '#0288D1',       // Azul información
    light: '#03A9F4',
    dark: '#01579B'
  }
};

// ============================================
// CONFIGURACIÓN DEL TEMA CLARO
// ============================================
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...isthoColors,
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF'
    },
    text: {
      primary: '#212121',
      secondary: '#757575'
    },
    divider: '#E0E0E0'
  },
  
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500
    },
    body1: {
      fontSize: '0.875rem'
    },
    body2: {
      fontSize: '0.8125rem'
    }
  },
  
  // Estilo de componentes personalizados
  components: {
    // Botones
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 4,
          fontWeight: 500,
          padding: '8px 16px'
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }
        }
      },
      defaultProps: {
        disableElevation: true
      }
    },
    
    // Cards
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
        }
      }
    },
    
    // Paper
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    
    // TextField
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined'
      }
    },
    
    // Table
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#F5F5F5',
          '& .MuiTableCell-root': {
            fontWeight: 600,
            color: '#455A64'
          }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#FFF3E0'
          }
        }
      }
    },
    
    // Drawer (Sidebar)
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#263238',
          color: '#FFFFFF'
        }
      }
    },
    
    // AppBar
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#212121',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
        }
      }
    },
    
    // Chip
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500
        }
      }
    }
  },
  
  // Forma de los componentes
  shape: {
    borderRadius: 4
  }
});

// ============================================
// CONFIGURACIÓN DEL TEMA OSCURO (Estilo WMS)
// ============================================
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...isthoColors,
    background: {
      default: '#1E1E1E',
      paper: '#2D2D2D'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0'
    },
    divider: '#424242'
  },
  
  typography: lightTheme.typography,
  
  components: {
    ...lightTheme.components,
    
    // Sobrescrituras específicas para tema oscuro
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1A1A1A',
          color: '#FFFFFF',
          borderRight: '1px solid #333'
        }
      }
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2D2D2D',
          color: '#FFFFFF',
          boxShadow: 'none',
          borderBottom: '1px solid #333'
        }
      }
    },
    
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#333',
          '& .MuiTableCell-root': {
            fontWeight: 600,
            color: '#E65100'
          }
        }
      }
    },
    
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(230, 81, 0, 0.1)'
          }
        }
      }
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#2D2D2D',
          border: '1px solid #333'
        }
      }
    }
  },
  
  shape: {
    borderRadius: 4
  }
});

export default lightTheme;