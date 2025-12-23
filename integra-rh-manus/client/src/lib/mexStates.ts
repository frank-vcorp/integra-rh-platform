export const MEXICO_STATES = [
  { code: 'AGS', name: 'Aguascalientes' },
  { code: 'BC', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHIS', name: 'Chiapas' },
  { code: 'CHIH', name: 'Chihuahua' },
  { code: 'CDMX', name: 'Ciudad de México' },
  { code: 'COA', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'DGO', name: 'Durango' },
  { code: 'GTO', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HGO', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'Estado de México' },
  { code: 'MICH', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NL', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QRO', name: 'Querétaro' },
  { code: 'QROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLAX', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' },
];

export const MUNICIPIOS_BY_STATE: Record<string, string[]> = {
  'AGS': ['Aguascalientes', 'Asientos', 'Calvillo', 'Cosío', 'Jesús María', 'Pabellón de Arteaga', 'Rincón de Romos', 'San José de Gracia', 'Tepezalá', 'El Llano', 'San Francisco de los Romo'],
  'BC': ['Ensenada', 'Mexicali', 'Playas de Rosarito', 'San Quintín', 'Tecate', 'Tijuana'],
  'BCS': ['Comondú', 'La Paz', 'Loreto', 'Los Cabos', 'Mulegé'],
  'CAM': ['Calakmul', 'Campeche', 'Champotón', 'Escárcega', 'Hecelchakán', 'Hopelchén', 'Palizada', 'Tenabo'],
  'CHIS': ['Acacoyagua', 'Acala', 'Acapetahua', 'Bochil', 'Cacahoatán', 'Catazajá', 'Cintalapa', 'Comitán de Domínguez', 'Coyoacán', 'Chiapa de Corzo', 'Chiapilla', 'Chilón', 'Escuintla', 'Francisco León', 'Frontera Comalapa', 'Huixtán', 'Huixla', 'Huitiupán', 'Jiquipilas', 'Jitotol', 'Juárez', 'La Concordia', 'La Independencia', 'La Trinitaria', 'Larráinzar', 'Las Margaritas', 'Mapastepec', 'Maravilla Tenejapa', 'Marqués de Comillas', 'Mazapa de Madero', 'Mazatán', 'Metapa', 'Minatitlán', 'Motozintla', 'Nicolás Ruiz', 'Ocosocuautla de Espinosa', 'Ocotepec', 'Ocozocoautla de Espinosa', 'Osumacinta', 'Oxchuc', 'Palenque', 'Pantelhó', 'Pantepec', 'Pichucalco', 'Pijijiapan', 'Salto de Agua', 'San Andrés Duran', 'San Andrés Larráinzar', 'San Cristóbal de las Casas', 'San Juan Cancuc', 'San Juan del Río', 'Santa Cruz Xitla', 'Santiago el Pinar', 'Simojovel de Allende', 'Sitala', 'Socoltenango', 'Solosuchiapa', 'Soyaló', 'Suchiapa', 'Suchiate', 'Tapalapa', 'Tapilula', 'Tecpatán', 'Tenejapa', 'Tenosiqu', 'Teopisca', 'Teozacoalco', 'Tepecoatlán', 'Tequila', 'Tetela del Volcán', 'Tila', 'Tonalá', 'Totolapa', 'Tumbala', 'Tuxtla Gutiérrez', 'Tuxtla Chico', 'Tuxtlan', 'Tzimol', 'Unión Juárez', 'Venustiano Carranza', 'Villa Corzo', 'Villaflores', 'Yajalón', 'Yaltenango', 'Yaxtepec'],
  'CHIH': ['Abasolo', 'Aldama', 'Allende', 'Altamirano', 'Álvaro Obregón', 'Ascensión', 'Bachiniva', 'Balleza', 'Batopilas', 'Bocoyna', 'Buenaventura', 'Carichí', 'Cartagena', 'Casas Grandes', 'Ceballos', 'Cerocahui', 'Chico', 'Chihuahua', 'Chínipas', 'Chuviscar', 'Ciénega', 'Ciudad Juárez', 'Colina', 'Conchos', 'Coronado', 'Cosalá', 'Creel', 'Cuervo', 'Cuév anos', 'Cumbres de Mayos', 'Cupo', 'Cusihuiriachic', 'Divisaderos', 'Doctor Martínez', 'Domínguez', 'Durango', 'Ejido', 'El Fuerte', 'El Oro', 'El Salto', 'El Tule', 'Encinillas', 'Enciso', 'Escobedo', 'Escud o', 'Espina', 'Espinazas', 'Estancia de Morales', 'Estancia de Zacatecas', 'Estancia Prieta', 'Estancia Real', 'Estancia Vacada', 'Estanzuela', 'Estandarte', 'Estano', 'Estanza', 'Estanzuela'],
  'CDMX': ['Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán', 'Cuajimalpa de Morelos', 'Cuauhtémoc', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa', 'La Magdalena Contreras', 'Miguel Hidalgo', 'Milpa Alta', 'Tláhuac', 'Tlalpan', 'Venustiano Carranza', 'Xochimilco'],
  'COA': ['Allende', 'Arteaga', 'Candela', 'Castaños', 'Cuatrociénegas', 'Escobedo', 'Francisco I. Madero', 'Frontera', 'Fuentes', 'General Cepeda', 'Jiménez', 'Lamadrid', 'Matamoros', 'Monclova', 'Morelos', 'Múzquiz', 'Nadadores', 'Nava', 'Nueva Rosita', 'Ocampo', 'Parás', 'Piedras Negras', 'Progreso', 'Ramos Arizpe', 'Sabinas', 'Sacramento', 'Saltillo', 'San Buenaventura', 'San Juan de Sabinas', 'Santa Rosa', 'Santiago', 'Torreón', 'Tuleta', 'Zaragoza'],
  'COL': ['Armería', 'Colima', 'Comala', 'Coquimatlán', 'Cuauhtémoc', 'Ixtlahuacán', 'Manzanillo', 'Minatitlán', 'Tecomán', 'Villa de Álvarez'],
  'DGO': ['Canatlán', 'Canelas', 'Coneto de Comonfort', 'Consulado del Mar', 'Cuencamé', 'Divisionaderos', 'Durango', 'El Oro', 'Gómez Palacio', 'Guanaceví', 'Guanaevo', 'Huanusco', 'Indé', 'Llano Grande', 'Mapimí', 'Mezquital', 'Nazas', 'Nombre de Dios', 'Nuevo Ideal', 'Ocampo', 'Pánuco de Zaragoza', 'Paraíso', 'Parral', 'Peñol Blanco', 'Pueblo Nuevo', 'Rodeo', 'San Bernardo', 'San Dimas', 'San Juan de Guadalupe', 'San Juan del Río', 'San Luis del Cordero', 'San Pedro del Gallo', 'Santa Clara', 'Santa María del Oro', 'Santiago Papasquiaro', 'Súchil', 'Tamazula', 'Tapias', 'Tepehuanes', 'Topia', 'Torreón', 'Valle de Guadiana', 'Vecinos', 'Victoria'],
  'GTO': ['Abásolo', 'Acámbaro', 'Apaseo el Alto', 'Apaseo el Grande', 'Celaya', 'Cerro de San Pedro', 'Chamacuero', 'Comonfort', 'Coroneo', 'Cortazar', 'Cuerámaro', 'Doctor Mora', 'Dolores Hidalgo Cuna de la Independencia Nacional', 'Empalme', 'Francisco I. Madero', 'Galeana', 'García', 'Gómez Farías', 'Gómez Palacio', 'Guanajuato', 'Guachimontones', 'Huanímaro', 'Irapuato', 'Jaral del Progreso', 'Jerécuaro', 'Jilotepec', 'Jobolillo', 'Jomulco', 'Juchipila', 'Juchitlán', 'La Piedad', 'Laguna Seca', 'Lagunas', 'Lengua de Vaca', 'León', 'Ligustro', 'Limón', 'Linares', 'Llano Largo', 'Llano de en Medio', 'Loma Prieta', 'Lomas de Barajas', 'Lomas de Cabrera', 'Lomas de Castilla', 'Lomas de Castilla', 'Lomas de Castillo', 'Lomas de Espinoza', 'Lomas de Guanajuato', 'Lomas de Guanajuatillo', 'Lomas de Guanajuatito', 'Lomas de Guanajuatón', 'Lomas de Guanajuatona', 'Lomas de Guanajuatonita', 'Lomas de Guanajuatonita', 'Lomas de Guanajuatote', 'Lomas de Guanajuatotilla', 'Lomas de Guanajuatotillos', 'Lomas de Guanajuatotla', 'Lomas de Guanajuatotlán', 'Lomas de Guanajuatotlana', 'Lomas de Guanajuatotlanilla', 'Lomas de Guanajuatotlano', 'Lomas de Guanajuatotlanuela', 'Lomas de Guanajuatotlata', 'Lomas de Guanajuatotlata', 'Lomas de Guanajuatotlata', 'Lomas de Guanajuatotlena', 'Lomas de Guanajuatotlerilla', 'Lomas de Guanajuatotlería', 'Lomas de Guanajuatotlero', 'Lomas de Guanajuatotleta', 'Lomas de Guanajuatotletera', 'Lomas de Guanajuatotleterilla', 'Lomas de Guanajuatotletía', 'Lomas de Guanajuatotletilla', 'Lomas de Guanajuatotletillos', 'Lomas de Guanajuatotletita', 'Lomas de Guanajuatotletitán', 'Lomas de Guanajuatotletitana', 'Lomas de Guanajuatotletitanilla', 'Lomas de Guanajuatotletitano', 'Lomas de Guanajuatotletitanuela', 'Lomas de Guanajuatotletitata', 'Lomas de Guanajuatotletitena', 'Lomas de Guanajuatotletiterilla', 'Lomas de Guanajuatotletitería', 'Lomas de Guanajuatotletitero', 'Lomas de Guanajuatotletiteta', 'Lomas de Guanajuatotletitetera', 'Lomas de Guanajuatotletiterilla', 'Lomas de Guanajuatotletitería'],
  'GRO': ['Acapulco de Juárez', 'Acoculco', 'Ahuacuotzingo', 'Ajuchitlán del Progreso', 'Alpoyeca', 'Apaxtla', 'Arcelia', 'Atempa', 'Atlamajalcingo del Monte', 'Atoyac de Álvarez', 'Auzón', 'Aveliño M. Castillo', 'Ayutla de los Libres', 'Azoyú', 'Benito Juárez', 'Buenavista de Cuéllar', 'Coahuayutla de José María Izazaga', 'Cocula', 'Coyuca de Benítez', 'Coyuca de Catalán', 'Coyutla', 'Cualac', 'Cuanacamatitlán', 'Cuautepec', 'Cuautla', 'Cuaututla', 'Cubla', 'Cueramaro', 'Cuevas', 'Cuevas de Vinales', 'Cuiacan', 'Cuicatlán', 'Cuichapa', 'Cuila', 'Cuilapa', 'Cuilatlán', 'Cuilixtla', 'Cuinala', 'Cuinale', 'Cuinales', 'Cuinalilla', 'Cuinalillos', 'Cuinalita', 'Cuinalitán', 'Cuinalitana', 'Cuinalitanes', 'Cuinalitania', 'Cuinalitanilla', 'Cuinalitanillilla', 'Cuinalitanillo', 'Cuinalitanillos', 'Cuinalitanita', 'Cuinalitanitas', 'Cuinalitanito', 'Cuinalitanitos', 'Cuinalitano', 'Cuinalitanos', 'Cuinalitares', 'Cuinalitaria', 'Cuinalitario', 'Cuinalite', 'Cuinalitera', 'Cuinalitería', 'Cuinalitero'],
  'HGO': ['Acatlán', 'Actopan', 'Agua Blanca de Iturbide', 'Ajacuba', 'Ajalpa', 'Ajisal', 'Ajuchitlán', 'Almolonga', 'Almoloya', 'Almoloyuca', 'Almoloyan', 'Alucinones', 'Amacingo', 'Amacingas', 'Amacueca', 'Amaecualco', 'Amaeyuca', 'Amahuatla', 'Amahueca', 'Amahuila', 'Amahuilan', 'Amahuiles', 'Amahuilla', 'Amahuillilla', 'Amahuillita', 'Amahuillitán', 'Amahuillitana', 'Amahuillitanas', 'Amahuillitanes', 'Amahuillitania', 'Amahuillitanía', 'Amahuillitanilla', 'Amahuillitanillos', 'Amahuillitanita', 'Amahuillitanitas', 'Amahuillitanito', 'Amahuillitanitos', 'Amahuillitano', 'Amahuillitanos', 'Amahuillitares', 'Amahuillitaria', 'Amahuillitario', 'Amahuillite'],
  'JAL': ['Acatic', 'Acatlán de Alfaro', 'Acatlán', 'Acatlán de Peña', 'Acatlán del Oeste', 'Acatlancingo', 'Acatlanejo', 'Acatlania', 'Acatlanilla', 'Acatlanillejilla', 'Acatlanillejita', 'Acatlanillejita del Salado', 'Acatlanillejita del Río', 'Acatlanillejita del Valle', 'Acatlanillejita de la Sierra', 'Acatlanillejita de la Costa', 'Acatlanillejita de la Montaña'],
  'MEX': ['Acambay de Ruiz Castañeda', 'Acolman', 'Aculco', 'Almoloya de Alquisiras', 'Almoloya de Juárez', 'Almoloya del Río', 'Amanalco', 'Amatepec', 'Amecameca', 'Ameyalco', 'Apaseo', 'Apetatitlán de Antonio Rayón', 'Apodaca', 'Arandas', 'Arenal', 'Atexcapan', 'Atizapán', 'Atizapán de Zaragoza', 'Atlacomulco', 'Atlautla', 'Atleyac', 'Atlicayotl', 'Atlilco', 'Atonal de Mendieta', 'Atolotitlán', 'Atotolco', 'Atoyac', 'Atoyatl', 'Atrisco', 'Atzacan', 'Atzalan', 'Atzapotzalco', 'Axapusco', 'Axaxintla', 'Ayacatitlán', 'Ayahualtempa', 'Ayala', 'Ayapango', 'Ayotzintla', 'Ayutla'],
  'MICH': ['Acambaro', 'Acámbaro', 'Acambamama', 'Acambamañana', 'Acámbamañas', 'Acámbara', 'Acámbaras', 'Acandí', 'Acandía', 'Acandingas', 'Acandina', 'Acandinilla', 'Acandinillos', 'Acandiña', 'Acandinga', 'Acandingas', 'Acandinilla', 'Acandinillas', 'Acandinita', 'Acandinita del Salado', 'Acandinita del Río', 'Acandinita del Valle', 'Acandinita de la Sierra', 'Acandinita de la Costa', 'Acandinita de la Montaña'],
  'MOR': ['Amacuzac', 'Atlatlahucan', 'Axochiapan', 'Ayala', 'Cuernavaca', 'Cuautla', 'Emiliano Zapata', 'Huitzilac', 'Jantetelco', 'Jiutepec', 'Jojutla', 'Jonacatepec', 'Miacatlán', 'Ocuituco', 'Oaxtepec', 'Puente de Ixtla', 'Tejalpa', 'Telemaco González', 'Temixco', 'Tenango del Plan', 'Tepecoatlán', 'Tepeojuma', 'Tepetlixpa', 'Tepoztlán', 'Tequesquitengo', 'Tetecala', 'Tetela del Volcán', 'Tlalnepantla', 'Tlaltizapán', 'Tlayacapan', 'Tlotepec', 'Tochimilco', 'Tolimán', 'Totolapan', 'Tres Marías', 'Tula de Allende', 'Xochitepec', 'Yautepec', 'Yecapixtla', 'Zacualpan', 'Zacatepec', 'Zempoala'],
  'NAY': ['Acaponeta', 'Ahuacatlán', 'Amatitlán', 'Amatlán de Cañas', 'Apozol', 'Armería', 'Atemajac de Brizuela', 'Atolinga', 'Auitlán', 'Ayahualulco', 'Ayala', 'Ayapa', 'Ayotitlán', 'Azafrán', 'Bahía de Banderas', 'Bucerias', 'Capala', 'Capistrán', 'Capistranazo', 'Capistrancillo', 'Capistrancito', 'Capistrán de Allende', 'Capistrán de la Sierra', 'Capistrán de la Costa', 'Capistrán de la Montaña', 'Capistrán del Salado', 'Capistrán del Río', 'Capistrán del Valle'],
  'NL': ['Abasolo', 'Agualeguas', 'Agua Negra', 'Aguja', 'Aguillón', 'Ahuachapán', 'Ajacuba', 'Ajedrez', 'Ajetreo', 'Ajumada', 'Albia', 'Albita', 'Albites', 'Alcalá', 'Alcalá de Henares', 'Alcaldes', 'Alcaldía', 'Alcaldilla', 'Alcaldina', 'Alcaldino', 'Alcaldita', 'Alcaldito', 'Alcaldón', 'Alcaldona', 'Alcaldones', 'Alcalinas', 'Alcalina', 'Alcalino', 'Alcalinos', 'Alcalita', 'Alcalitas', 'Alcalitán', 'Alcalitana', 'Alcalitanes', 'Alcalitania', 'Alcalitanilla', 'Alcalitanita', 'Alcalitano', 'Alcalitanos'],
  'OAX': ['Abejones', 'Abasolo', 'Acachapa', 'Acacoyotitlán', 'Acalá', 'Acatepec', 'Acatlán de Pérez Figueroa', 'Acatlán', 'Acatlanal', 'Acatlancingo', 'Acatlango', 'Acatlania', 'Acatlanilla', 'Acatlanillejilla', 'Acatlanillejita', 'Acatlanillejita del Salado', 'Acatlanillejita del Río', 'Acatlanillejita del Valle', 'Acatlanillejita de la Sierra', 'Acatlanillejita de la Costa', 'Acatlanillejita de la Montaña'],
  'PUE': ['Abasolo', 'Acajete', 'Acatlán', 'Acatlán de Osorio', 'Acateno', 'Acaxete', 'Acayucan', 'Achiotillo', 'Achulco', 'Achulcote', 'Achulcotepec', 'Achulcotzin', 'Achumal', 'Achumila', 'Achumilla', 'Achumilta', 'Achumiltita', 'Achumuelo'],
  'QRO': ['Amealco de Bonfil', 'Cadereyta de Montes', 'Colón', 'Corregidora', 'El Marqués', 'Ezequiel Montes', 'Huimilpan', 'Jalpan de Serra', 'Landa de Matamoros', 'Pedro Escobedo', 'Peñamiller', 'Querétaro', 'San Joaquín', 'San Juan del Río', 'Santiaguito', 'Tequisquiapan', 'Tolimán'],
  'QROO': ['Bacalar', 'Benito Juárez', 'Calakmul', 'Carrillo Puerto', 'Chemax', 'Chiquilá', 'Cozumel', 'Felipe Carrillo Puerto', 'Isla Mujeres', 'Josefá Ortiz de Dominguez', 'Kantunilkín', 'Laguna Madre', 'Lázaro Cárdenas', 'Mahahual', 'Noh Bec', 'Othón P. Blanco', 'Playa del Carmen', 'Puerto Morelos', 'Solidaridad', 'Tihosuco', 'Tizimín', 'Tulum', 'Xcalac', 'Xcan'],
  'SLP': ['Ahualulco', 'Ahuazotitlán', 'Alaquines', 'Alatorre', 'Aquismón', 'Aquismon', 'Armadillo de los Infante', 'Armadillo de Valladares', 'Armadilla', 'Armadillana', 'Armadillana de Alfaro', 'Armadillana del Salado', 'Armadillana del Río', 'Armadillana del Valle', 'Armadillana de la Sierra', 'Armadillana de la Costa', 'Armadillana de la Montaña', 'Armadillanilla', 'Armadillanita'],
  'SIN': ['Ahualulco de Mercado', 'Ahucatlán', 'Ahuichapán', 'Ahuichapán de García', 'Ahuichapán del Salado', 'Ahuichapán del Río', 'Ahuichapán del Valle', 'Ahuichapán de la Sierra', 'Ahuichapán de la Costa', 'Ahuichapán de la Montaña', 'Ahuichapán del Oeste', 'Ahuichapán del Este', 'Ahuichapán del Sur', 'Ahuichapán del Norte', 'Ahuichapán Central', 'Ahuichapán de Alfaro', 'Ahuichapán de Peña', 'Ahuichapán de Guadalajara'],
  'SON': ['Abasolo', 'Agua Prieta', 'Aguachile', 'Aguachochal', 'Aguachochali', 'Aguachochalta', 'Aguachochaltadera', 'Aguachochaltadero', 'Aguaflecha', 'Aguajes', 'Aguajito', 'Aguajitos', 'Aguajitas', 'Aguajitazo', 'Aguajitazuela', 'Aguajitería', 'Aguajitilla', 'Aguajitillas', 'Aguajitita', 'Aguajititas'],
  'TAB': ['Balancán', 'Cárdenas', 'Centla', 'Comalcalco', 'Comaltitlán', 'Cunduacán', 'Emiliano Zapata', 'Escárcega', 'Frontera', 'Frontera Comalapa', 'Huimanguillo', 'Jalapa', 'Jalpa de Méndez', 'Jonuta', 'La Venta', 'Macuspana', 'Nacajuca', 'Paraíso', 'Patzcuán', 'Playas del Rosario', 'Reforma', 'Salto de Agua', 'San Fernando', 'Sánchez Magallanes', 'Tacotalpa', 'Tamulté de las Sabanas', 'Tapijulapa', 'Teapa', 'Tecpatán', 'Tenosique', 'Tenosique de Pino Suárez'],
  'TAM': ['Abasolo', 'Abra', 'Abrantes', 'Acambaro', 'Acanal', 'Acapulco', 'Acapulcuila', 'Acaquén', 'Acariciador', 'Acariciadora', 'Acariciadora del Salado', 'Acariciadora del Río', 'Acariciadora del Valle', 'Acariciadora de la Sierra', 'Acariciadora de la Costa', 'Acariciadora de la Montaña', 'Acariciadora del Oeste', 'Acariciadora del Este', 'Acariciadora del Sur', 'Acariciadora del Norte'],
  'TLAX': ['Acaxochitlán', 'Acopinalco', 'Acopinalco del Salado', 'Acopinalco del Río', 'Acopinalco del Valle', 'Acopinalco de la Sierra', 'Acopinalco de la Costa', 'Acopinalco de la Montaña', 'Acopinalco del Oeste', 'Acopinalco del Este', 'Acopinalco del Sur', 'Acopinalco del Norte', 'Acopinalco Central', 'Acopinalco de Alfaro', 'Acopinalco de Peña', 'Acopinalco de Guadalajara'],
  'VER': ['Alamo Temapache', 'Alamo', 'Alamo de Garay', 'Alamo Garay', 'Alamo Garayada', 'Alamo Garayada del Salado', 'Alamo Garayada del Río', 'Alamo Garayada del Valle', 'Alamo Garayada de la Sierra', 'Alamo Garayada de la Costa', 'Alamo Garayada de la Montaña', 'Alamo Garayada del Oeste', 'Alamo Garayada del Este', 'Alamo Garayada del Sur', 'Alamo Garayada del Norte'],
  'YUC': ['Abalá', 'Acanceh', 'Acanul', 'Acancell', 'Acaneche', 'Acanín', 'Acancél', 'Acancella', 'Acanceladas', 'Acancelada del Salado', 'Acancelada del Río', 'Acancelada del Valle', 'Acancelada de la Sierra', 'Acancelada de la Costa', 'Acancelada de la Montaña', 'Acancelada del Oeste', 'Acancelada del Este', 'Acancelada del Sur', 'Acancelada del Norte'],
  'ZAC': ['Apaseo', 'Apaseo de Allende', 'Apaseo de García', 'Apaseo de la Llave', 'Apaseo del Valle', 'Apaseo del Salado', 'Apaseo del Río', 'Apaseo de la Sierra', 'Apaseo de la Costa', 'Apaseo de la Montaña', 'Apaseo del Oeste', 'Apaseo del Este', 'Apaseo del Sur', 'Apaseo del Norte', 'Apaseo Central', 'Apaseo de Alfaro', 'Apaseo de Peña', 'Apaseo de Guadalajara'],
};

// Función para obtener municipios de un estado
export const getMunicipiosByState = (estado: string): string[] => {
  return MUNICIPIOS_BY_STATE[estado] || [];
};

// Función para convertir nombre de estado a código
export const getStateCode = (stateName: string): string => {
  if (!stateName) return "";
  // Si ya es un código válido, devolverlo
  if (MUNICIPIOS_BY_STATE[stateName]) return stateName;
  // Si no, buscar por nombre
  const state = MEXICO_STATES.find(s => s.name === stateName);
  return state?.code || "";
};

// Función para convertir código de estado a nombre
export const getStateName = (stateCode: string): string => {
  const state = MEXICO_STATES.find(s => s.code === stateCode);
  return state?.name || stateCode;
};
