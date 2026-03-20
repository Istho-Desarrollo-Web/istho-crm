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
  // Colores primarios - Azul Marino CENTHRIX
  primary: {
    main: '#1A1A2E',       // Azul Marino principal
    light: '#2A2A4E',
    dark: '#0F1023',
    contrastText: '#FFFFFF'
  },

  // Colores secundarios - Rojo Energía (accent)
  secondary: {
    main: '#E74C3C',       // Rojo Energía
    light: '#FF6B5A',
    dark: '#C0392B',
    contrastText: '#FFFFFF'
  },

  // Colores de estado
  success: {
    main: '#2ECC71',       // Verde Logístico
    light: '#3DDB83',
    dark: '#27AE60'
  },
  warning: {
    main: '#F39C12',       // Ámbar advertencia
    light: '#F7B731',
    dark: '#E67E22'
  },
  error: {
    main: '#E74C3C',       // Rojo Energía
    light: '#FF6B5A',
    dark: '#C0392B'
  },
  info: {
    main: '#3498DB',       // Azul información
    light: '#5DADE2',
    dark: '#2980B9'
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
    fontFamily: '"Segoe UI", Calibri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
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
          backgroundColor: '#F8F9FA',
          '& .MuiTableCell-root': {
            fontWeight: 600,
            color: '#1A1A2E'
          }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#FDEDEC'
          }
        }
      }
    },
    
    // Drawer (Sidebar)
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1A1A2E',
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
      default: '#0F1023',
      paper: '#1A1B3A'
    },
    text: {
      primary: '#F0F0F5',
      secondary: '#B0BEC5'
    },
    divider: 'rgba(255,255,255,0.08)'
  },
  
  typography: lightTheme.typography,
  
  components: {
    ...lightTheme.components,
    
    // Sobrescrituras específicas para tema oscuro
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0F1023',
          color: '#F0F0F5',
          borderRight: '1px solid rgba(255,255,255,0.08)'
        }
      }
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#151631',
          color: '#F0F0F5',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }
      }
    },
    
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#151631',
          '& .MuiTableCell-root': {
            fontWeight: 600,
            color: '#E74C3C'
          }
        }
      }
    },
    
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(231, 76, 60, 0.1)'
          }
        }
      }
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A1B3A',
          border: '1px solid rgba(255,255,255,0.08)'
        }
      }
    }
  },
  
  shape: {
    borderRadius: 4
  }
});

export default lightTheme;