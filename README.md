# Home Automation Server
## System overview
Home Automation System (HAS) at this moment is shown on picture:
![Alt text](description_addons/SystemOverview.png?raw=true)

As it can be seen on diagram system consist of next hardware devices:
- [Water Pump Controller (WPC)](https://github.com/vpq-is-me/WaterPumpController_ESP32.git) ->control and protect pump installed in well (underground). Hart of controller is ESP32 MCU.
- [Septic Protection (SP)](https://github.com/vpq-is-me/SepticProtectionESP32.git) ->protect Sewage Treatment System. Also use ESP32.
- Raspberry Pi (RPI) as server.
RPI, WPC and SP controllers are connected to each other through Bluetooth MESH. RPI use for this purpose ESP-wroom-32 board connected to GPIO UART. Firmware for this board is named [RaspberryPi_UART_companion_ESP32](https://github.com/vpq-is-me/RaspberryPi_UART_companion_ESP32.git).

## Station software
For Raspberry Pi developed next separate software.
- [UART_server](https://github.com/vpq-is-me/UART_server.git). This application connect to __RaspberryPi_UART_companion_ESP32__ by UART and dispath received messages from BLE Mesh to consumer applications and vice virsa. Consumers connect to __UART_server__ by UNIX socket. In future it is planned to change this BLE Mesh dispather by another that can use RPI's internal bluetooth driver. Writed on C language.
- [Water_Pump_Manager](https://github.com/vpq-is-me/water_pump-manager.git). This application collect data from __WaterPumpController__ and save it in sqlite database. Also it serve request for data from __home_auto__ webserver. Writed on C/C++ language.
- [Septic_Manager](https://github.com/vpq-is-me/SepticManager.git). This application collect data from __Septic Protection controller__ and save it in sqlite database. Also it serve request for data from __home_auto__ webserver. Writed on C/C++ language.
- __home_auto__ node.js Web server established in this git project. It request data from databases managers applications and show on web page that can be reached through LAN. By using this information and trands we can make decision about system health: 
  + if air is leaked from Hydrqulic Accumulator, 
  + if Water Pump is worn out, has reduced capacity and has to be mantained or replaced
  + by Water Flowmeter we know requirement of filter replacement
  + etc.
	  
### web page screenshot 
![Alt text](description_addons/web_page.jpg?raw=true)

In case of any alarm __home_auto__ send alarm notification to Telegram bot on smartphone. Example of bot screenshot showen bellow
![Alt text](description_addons/TelegramBot.jpg?raw=true)
